// routes/transactions.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * LOOKUPS for New Transaction modal
 * - Guests
 * - Users
 * - Rooms (ONLY Available)
 * - Inventory (ONLY quantity > 0)
 */
router.get("/lookups", async (req, res) => {
  try {
    const [guests] = await pool.query(
      `SELECT guest_id, guest_name
       FROM guests
       ORDER BY guest_name`
    );

    const [users] = await pool.query(
      `SELECT user_id, username
       FROM users
       ORDER BY user_id DESC`
    );

    // ✅ Only "Available" rooms are returned (hides Cleaning/Not Available)
    const [rooms] = await pool.query(`
      SELECT r.room_id, r.room_number, rt.type_name, rt.base_rate, rs.status_name
      FROM rooms r
      LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
      WHERE LOWER(rs.status_name) = 'available'
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED), r.room_id
    `);

    // ✅ Inventory items for Purchased Items dropdown (only those with stock)
    const [inventory] = await pool.query(`
      SELECT inv_id, item_name, quantity
      FROM inventory
      WHERE COALESCE(quantity, 0) > 0
      ORDER BY item_name
    `);

    res.json({ guests, users, rooms, inventory });
  } catch (e) {
    console.error("transactions/lookups error:", e);
    res.status(500).json({ message: "Failed to load transaction lookups" });
  }
});

// list transactions
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.trans_id,
        t.guest_id, g.guest_name,
        t.user_id, u.username,
        t.room_id, r.room_number,
        t.checkin, t.checkout,
        t.actual_rate_charged,
        t.date_created,
        t.trans_status_id,
        ts.status_name AS trans_status_name
      FROM transactions t
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN users u ON u.user_id = t.user_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      LEFT JOIN transaction_status ts ON ts.trans_status_id = t.trans_status_id
      ORDER BY t.trans_id DESC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("transactions list error:", e);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// create transaction
router.post("/", async (req, res) => {
  const { guest_id, user_id, room_id, checkin, checkout, actual_rate_charged, trans_status_id } = req.body;

  if (!guest_id || !user_id || !room_id) {
    return res.status(400).json({ message: "guest_id, user_id, room_id are required" });
  }

  try {
    const [r] = await pool.query(
      `INSERT INTO transactions
       (guest_id, user_id, room_id, trans_status_id, checkin, checkout, actual_rate_charged, date_created)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(guest_id),
        Number(user_id),
        Number(room_id),
        trans_status_id ? Number(trans_status_id) : 1,
        checkin ?? null,
        checkout ?? null,
        actual_rate_charged ?? null
      ]
    );

    res.status(201).json({ trans_id: r.insertId });
  } catch (e) {
    console.error("transactions create error:", e);
    res.status(500).json({ message: "Failed to create transaction" });
  }
});

// update transaction
router.put("/:id", async (req, res) => {
  const { guest_id, user_id, room_id, checkin, checkout, actual_rate_charged, trans_status_id } = req.body;

  try {
    const [r] = await pool.query(
      `UPDATE transactions
       SET guest_id=?, user_id=?, room_id=?, trans_status_id=?, checkin=?, checkout=?, actual_rate_charged=?
       WHERE trans_id=?`,
      [
        Number(guest_id),
        Number(user_id),
        Number(room_id),
        Number(trans_status_id),
        checkin ?? null,
        checkout ?? null,
        actual_rate_charged ?? null,
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Transaction not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("transactions update error:", e);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

// delete transaction
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM transactions WHERE trans_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Transaction not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("transactions delete error:", e);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

/**
 * PURCHASED ITEMS (connected to inventory)
 * GET  /transactions/:id/items
 * POST /transactions/:id/items   { inv_id, quantity, unit_cost }
 * DELETE /transactions/:id/items/:itemId   (restores inventory quantity)
 */

router.get("/:id/items", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ti.id, ti.inv_id, i.item_name, ti.quantity, ti.unit_cost, ti.subtotal, ti.created_at
       FROM transaction_items ti
       LEFT JOIN inventory i ON i.inv_id = ti.inv_id
       WHERE ti.trans_id = ?
       ORDER BY ti.id DESC`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) {
    console.error("tx items list error:", e);
    res.status(500).json({ message: "Failed to load purchased items" });
  }
});

router.post("/:id/items", async (req, res) => {
  const transId = Number(req.params.id);
  const inv_id = Number(req.body.inv_id);
  const qty = Number(req.body.quantity);
  const unitCost = Number(req.body.unit_cost);

  if (!transId || !inv_id || !qty || qty <= 0 || Number.isNaN(unitCost) || unitCost < 0) {
    return res.status(400).json({ message: "transId, inv_id, quantity (>0), unit_cost (>=0) are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock inventory row
    const [[inv]] = await conn.query(
      `SELECT inv_id, item_name, quantity
       FROM inventory
       WHERE inv_id = ?
       FOR UPDATE`,
      [inv_id]
    );

    if (!inv) throw new Error("Inventory item not found");
    if (Number(inv.quantity || 0) < qty) throw new Error("Not enough stock");

    const subtotal = unitCost * qty;

    const [ins] = await conn.query(
      `INSERT INTO transaction_items (trans_id, inv_id, quantity, unit_cost, subtotal)
       VALUES (?, ?, ?, ?, ?)`,
      [transId, inv_id, qty, unitCost, subtotal]
    );

    await conn.query(
      `UPDATE inventory
       SET quantity = quantity - ?
       WHERE inv_id = ?`,
      [qty, inv_id]
    );

    await conn.commit();
    res.status(201).json({ id: ins.insertId });
  } catch (e) {
    await conn.rollback();
    console.error("tx items add error:", e);
    res.status(400).json({ message: e.message || "Failed to add purchased item" });
  } finally {
    conn.release();
  }
});

router.delete("/:id/items/:itemId", async (req, res) => {
  const transId = Number(req.params.id);
  const itemId = Number(req.params.itemId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[row]] = await conn.query(
      `SELECT id, inv_id, quantity
       FROM transaction_items
       WHERE id = ? AND trans_id = ?
       FOR UPDATE`,
      [itemId, transId]
    );

    if (!row) throw new Error("Purchased item not found");

    // restore stock
    await conn.query(
      `UPDATE inventory
       SET quantity = quantity + ?
       WHERE inv_id = ?`,
      [Number(row.quantity), Number(row.inv_id)]
    );

    const [del] = await conn.query(
      `DELETE FROM transaction_items WHERE id = ? AND trans_id = ?`,
      [itemId, transId]
    );

    await conn.commit();
    res.json({ deleted: del.affectedRows });
  } catch (e) {
    await conn.rollback();
    console.error("tx items delete error:", e);
    res.status(400).json({ message: e.message || "Failed to delete purchased item" });
  } finally {
    conn.release();
  }
});

module.exports = router;