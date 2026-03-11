const express = require("express");
const pool = require("../db");

const router = express.Router();

function calculateRoomRate(hours) {
  if (hours <= 3) return 80;
  if (hours <= 8) return 150;
  if (hours <= 12) return 200;
  return 200 + 20 * (hours - 12);
}

function computeRoomHours(checkin, checkout) {
  const ms = new Date(checkout) - new Date(checkin);
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
}

/**
 * GET /api/transactions/lookups
 */
router.get("/lookups", async (req, res) => {
  try {
    const [guests] = await pool.query(`
      SELECT guest_id, guest_name
      FROM guests
      ORDER BY guest_name
    `);

    const [users] = await pool.query(`
      SELECT user_id, username
      FROM users
      ORDER BY username
    `);

    const [rooms] = await pool.query(`
      SELECT
        r.room_id,
        r.room_number,
        rt.type_name,
        rt.base_rate,
        rs.status_name
      FROM rooms r
      LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
      ORDER BY r.room_number, r.room_id
    `);

    const [inventory] = await pool.query(`
      SELECT inv_id, item_name, quantity, item_value
      FROM inventory
      WHERE COALESCE(quantity, 0) > 0
      ORDER BY item_name
    `);

    res.json({
      guests: Array.isArray(guests) ? guests : [],
      users: Array.isArray(users) ? users : [],
      rooms: Array.isArray(rooms) ? rooms : [],
      inventory: Array.isArray(inventory) ? inventory : [],
    });
  } catch (e) {
    console.error("transactions/lookups error:", e);
    res.status(500).json({
      message: "Failed to load transaction lookups",
      error: e.code || e.message,
    });
  }
});

/**
 * GET /api/transactions
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.trans_id,
        t.guest_id,
        g.guest_name,
        t.user_id,
        u.username,
        t.room_id,
        r.room_number,
        t.checkin,
        t.checkout,
        t.actual_rate_charged,
        t.date_created,
        t.trans_status_id,
        ts.status_name AS transaction_status,
        TIMESTAMPDIFF(HOUR, t.checkin, t.checkout) AS room_hours,
        COALESCE(gd.total_guest_damage, 0) AS total_damage,
        COALESCE(s.total_sales, 0) AS sales_total,
        (COALESCE(t.actual_rate_charged, 0) + COALESCE(gd.total_guest_damage, 0) + COALESCE(s.total_sales, 0)) AS total_bill
      FROM transactions t
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN users u ON u.user_id = t.user_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      LEFT JOIN transaction_status ts ON ts.trans_status_id = t.trans_status_id
      LEFT JOIN (
        SELECT trans_id, SUM(charge_amount) AS total_guest_damage
        FROM guest_damage
        GROUP BY trans_id
      ) gd ON gd.trans_id = t.trans_id
      LEFT JOIN (
        SELECT s.trans_id, SUM(sd.quantity * sd.unit_price_sold) AS total_sales
        FROM sales s
        JOIN sales_details sd ON sd.sales_id = s.sales_id
        GROUP BY s.trans_id
      ) s ON s.trans_id = t.trans_id
      ORDER BY t.trans_id DESC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("transactions list error:", e);
    res.status(500).json({
      message: "Failed to fetch transactions",
      error: e.code || e.message,
    });
  }
});

/**
 * POST /api/transactions
 */
router.post("/", async (req, res) => {
  const {
    guest_id,
    user_id,
    room_id,
    checkin,
    checkout,
    trans_status_id,
  } = req.body;

  if (!guest_id || !user_id || !room_id || !checkin || !checkout) {
    return res.status(400).json({
      message: "guest_id, user_id, room_id, checkin, checkout are required",
    });
  }

  const roomHours = computeRoomHours(checkin, checkout);
  const roomCost = calculateRoomRate(roomHours);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[room]] = await conn.query(
      `
      SELECT r.room_id, rs.status_name
      FROM rooms r
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
      WHERE r.room_id = ?
      FOR UPDATE
      `,
      [Number(room_id)]
    );

    if (!room) throw new Error("Room not found");

    if (String(room.status_name || "").toLowerCase() !== "available") {
      throw new Error("Room is not available");
    }

    const [r] = await conn.query(
      `
      INSERT INTO transactions
      (guest_id, user_id, room_id, trans_status_id, checkin, checkout, actual_rate_charged, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        Number(guest_id),
        Number(user_id),
        Number(room_id),
        Number(trans_status_id || 1),
        checkin,
        checkout,
        roomCost,
      ]
    );

    await conn.query(
      `UPDATE rooms
       SET room_status_id = (
         SELECT room_status_id
         FROM room_status
         WHERE LOWER(status_name) = 'not available'
         LIMIT 1
       )
       WHERE room_id = ?`,
      [Number(room_id)]
    );

    await conn.commit();

    res.status(201).json({
      trans_id: r.insertId,
      room_hours: roomHours,
      room_cost: roomCost,
      total_damage: 0,
      sales_total: 0,
      total_bill: roomCost,
    });
  } catch (e) {
    await conn.rollback();
    console.error("transactions create error:", e);
    res.status(400).json({
      message: e.message || "Failed to create transaction",
    });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/transactions/:id
 */
router.put("/:id", async (req, res) => {
  const {
    guest_id,
    user_id,
    room_id,
    checkin,
    checkout,
    trans_status_id,
  } = req.body;

  try {
    const id = Number(req.params.id);
    const roomHours = computeRoomHours(checkin, checkout);
    const roomCost = calculateRoomRate(roomHours);

    const [r] = await pool.query(
      `
      UPDATE transactions
      SET guest_id=?, user_id=?, room_id=?, trans_status_id=?, checkin=?, checkout=?, actual_rate_charged=?
      WHERE trans_id=?
      `,
      [
        Number(guest_id),
        Number(user_id),
        Number(room_id),
        Number(trans_status_id || 1),
        checkin ?? null,
        checkout ?? null,
        roomCost,
        id,
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("transactions update error:", e);
    res.status(500).json({
      message: "Failed to update transaction",
      error: e.code || e.message,
    });
  }
});

/**
 * DELETE /api/transactions/:id
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[tx]] = await conn.query(
      `SELECT room_id FROM transactions WHERE trans_id = ?`,
      [id]
    );

    if (!tx) {
      await conn.rollback();
      return res.status(404).json({ message: "Transaction not found" });
    }

    const [salesRows] = await conn.query(
      `SELECT sales_id FROM sales WHERE trans_id = ?`,
      [id]
    );

    for (const s of salesRows) {
      await conn.query(`DELETE FROM sales_details WHERE sales_id = ?`, [s.sales_id]);
    }

    await conn.query(`DELETE FROM sales WHERE trans_id = ?`, [id]);
    await conn.query(`DELETE FROM guest_damage WHERE trans_id = ?`, [id]);
    await conn.query(`DELETE FROM purchased WHERE trans_id = ?`, [id]);
    await conn.query(`DELETE FROM transactions WHERE trans_id = ?`, [id]);

    await conn.query(
      `UPDATE rooms
       SET room_status_id = (
         SELECT room_status_id
         FROM room_status
         WHERE LOWER(status_name) = 'available'
         LIMIT 1
       )
       WHERE room_id = ?`,
      [Number(tx.room_id)]
    );

    await conn.commit();
    res.json({ deleted: 1 });
  } catch (e) {
    await conn.rollback();
    console.error("transactions delete error:", e);
    res.status(500).json({
      message: "Failed to delete transaction",
      error: e.code || e.message,
    });
  } finally {
    conn.release();
  }
});

module.exports = router;