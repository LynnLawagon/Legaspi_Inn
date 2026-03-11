const express = require("express");
const pool = require("../db");
const router = express.Router();

function severityRate(damage_status_id) {
  const rates = {
    1: 0.10,
    2: 0.30,
    3: 0.70,
    4: 1.00,
  };
  return rates[Number(damage_status_id)] ?? 0;
}

function calculateDamageFee(itemValue, damageStatusId) {
  const rate = severityRate(damageStatusId);
  return Number((Number(itemValue || 0) * rate).toFixed(2));
}

// GET /api/damages?limit=50
// Dashboard use: return BOTH guest and employee damages
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM (
        SELECT
          CONCAT('guest-', gd.gdam_id) AS row_id,
          'guest' AS damage_source,
          gd.gdam_id AS damage_id,
          gd.trans_id,
          NULL AS user_id,
          i.inv_id,
          i.item_name,
          gd.charge_amount AS amount,
          gd.damage_status_id,
          ds.status_name AS damage_status,
          g.guest_name AS person_name,
          r.room_number,
          gd.date_reported
        FROM guest_damage gd
        LEFT JOIN inventory i ON i.inv_id = gd.inv_id
        LEFT JOIN damage_status ds ON ds.damage_status_id = gd.damage_status_id
        LEFT JOIN transactions t ON t.trans_id = gd.trans_id
        LEFT JOIN guests g ON g.guest_id = t.guest_id
        LEFT JOIN rooms r ON r.room_id = t.room_id

        UNION ALL

        SELECT
          CONCAT('employee-', ed.edam_id) AS row_id,
          'employee' AS damage_source,
          ed.edam_id AS damage_id,
          NULL AS trans_id,
          ed.user_id,
          i.inv_id,
          i.item_name,
          ed.cost AS amount,
          ed.damage_status_id,
          ds.status_name AS damage_status,
          u.username AS person_name,
          NULL AS room_number,
          ed.date_reported
        FROM employee_damage ed
        LEFT JOIN inventory i ON i.inv_id = ed.inv_id
        LEFT JOIN damage_status ds ON ds.damage_status_id = ed.damage_status_id
        LEFT JOIN users u ON u.user_id = ed.user_id
      ) x
      ORDER BY x.date_reported DESC, x.damage_id DESC
      LIMIT ?
      `,
      [limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("damages list error:", e);
    res.status(500).json({ message: "Failed to fetch damages", error: e.code || e.message });
  }
});

// GET /api/damages/transaction/:transId
router.get("/transaction/:transId", async (req, res) => {
  try {
    const transId = Number(req.params.transId);

    const [rows] = await pool.query(
      `
      SELECT
        gd.gdam_id,
        gd.trans_id,
        gd.inv_id,
        i.item_name,
        i.item_value,
        gd.charge_amount,
        gd.damage_status_id,
        ds.status_name AS damage_status,
        gd.date_reported
      FROM guest_damage gd
      LEFT JOIN inventory i ON i.inv_id = gd.inv_id
      LEFT JOIN damage_status ds ON ds.damage_status_id = gd.damage_status_id
      WHERE gd.trans_id = ?
      ORDER BY gd.gdam_id DESC
      `,
      [transId]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("damages by transaction error:", e);
    res.status(500).json({ message: "Failed to fetch guest damages", error: e.code || e.message });
  }
});

// GET /api/damages/lookups
router.get("/lookups", async (req, res) => {
  try {
    const [transactions] = await pool.query(`
      SELECT
        t.trans_id,
        g.guest_name,
        r.room_number
      FROM transactions t
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      ORDER BY t.trans_id DESC
    `);

    const [inventory] = await pool.query(`
      SELECT inv_id, item_name, quantity, item_value
      FROM inventory
      ORDER BY item_name ASC
    `);

    const [statuses] = await pool.query(`
      SELECT damage_status_id, status_name
      FROM damage_status
      ORDER BY damage_status_id ASC
    `);

    res.json({
      transactions: Array.isArray(transactions) ? transactions : [],
      inventory: Array.isArray(inventory) ? inventory : [],
      statuses: Array.isArray(statuses) ? statuses : [],
    });
  } catch (e) {
    console.error("damages lookups error:", e);
    res.status(500).json({ message: "Failed to load damages lookups", error: e.code || e.message });
  }
});

// POST /api/damages
router.post("/", async (req, res) => {
  const { trans_id, inv_id, damage_status_id, date_reported } = req.body;

  if (!trans_id || !inv_id || !damage_status_id) {
    return res.status(400).json({
      message: "trans_id, inv_id, damage_status_id are required",
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[inv]] = await conn.query(
      `SELECT inv_id, quantity, item_value FROM inventory WHERE inv_id = ? FOR UPDATE`,
      [Number(inv_id)]
    );

    if (!inv) throw new Error("Inventory item not found");
    if (Number(inv.quantity || 0) <= 0) throw new Error("Item is already out of stock");

    const fee = calculateDamageFee(inv.item_value, damage_status_id);

    const [r] = await conn.query(
      `
      INSERT INTO guest_damage
      (trans_id, inv_id, charge_amount, date_reported, damage_status_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(trans_id),
        Number(inv_id),
        fee,
        date_reported ?? new Date(),
        Number(damage_status_id),
      ]
    );

    await conn.query(
      `UPDATE inventory SET quantity = quantity - 1 WHERE inv_id = ?`,
      [Number(inv_id)]
    );

    await conn.commit();

    res.status(201).json({
      gdam_id: r.insertId,
      charge_amount: fee,
    });
  } catch (e) {
    await conn.rollback();
    console.error("create damage error:", e);
    res.status(400).json({ message: e.message || "Failed to create damage" });
  } finally {
    conn.release();
  }
});

// PUT /api/damages/:id
router.put("/:id", async (req, res) => {
  const { trans_id, inv_id, damage_status_id, date_reported } = req.body;

  if (!trans_id || !inv_id || !damage_status_id) {
    return res.status(400).json({
      message: "trans_id, inv_id, damage_status_id are required",
    });
  }

  try {
    const [[inv]] = await pool.query(
      `SELECT item_value FROM inventory WHERE inv_id = ?`,
      [Number(inv_id)]
    );

    if (!inv) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const fee = calculateDamageFee(inv.item_value, damage_status_id);

    const [r] = await pool.query(
      `
      UPDATE guest_damage
      SET trans_id=?, inv_id=?, charge_amount=?, date_reported=?, damage_status_id=?
      WHERE gdam_id=?
      `,
      [
        Number(trans_id),
        Number(inv_id),
        fee,
        date_reported ?? new Date(),
        Number(damage_status_id),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Damage not found" });
    }

    res.json({ updated: r.affectedRows, charge_amount: fee });
  } catch (e) {
    console.error("update damage error:", e);
    res.status(500).json({ message: "Failed to update damage", error: e.code || e.message });
  }
});

// DELETE /api/damages/:id
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM guest_damage WHERE gdam_id = ?`,
      [Number(req.params.id)]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Damage not found" });
    }

    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete damage error:", e);
    res.status(500).json({ message: "Failed to delete damage", error: e.code || e.message });
  }
});

module.exports = router;