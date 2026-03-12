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

// GET 
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const userId = req.query.user_id ? Number(req.query.user_id) : null;

    const [rows] = await pool.query(
      `
      SELECT
        ed.edam_id,
        ed.user_id,
        u.username,
        ed.inv_id,
        i.item_name AS inventory_name,
        i.item_value,
        ed.cost,
        ed.date_reported,
        ed.damage_status_id,
        ds.status_name AS damage_status
      FROM employee_damage ed
      LEFT JOIN users u ON u.user_id = ed.user_id
      LEFT JOIN inventory i ON i.inv_id = ed.inv_id
      LEFT JOIN damage_status ds ON ds.damage_status_id = ed.damage_status_id
      ${userId ? "WHERE ed.user_id = ?" : ""}
      ORDER BY ed.edam_id DESC
      LIMIT ?
      `,
      userId ? [userId, limit] : [limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("employee damage list error:", e);
    res.status(500).json({ message: "Failed to fetch employee damages", error: e.code || e.message });
  }
});

// GET
router.get("/lookups", async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT user_id, username
      FROM users
      ORDER BY username ASC
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
      users: Array.isArray(users) ? users : [],
      inventory: Array.isArray(inventory) ? inventory : [],
      statuses: Array.isArray(statuses) ? statuses : [],
    });
  } catch (e) {
    console.error("employee damage lookups error:", e);
    res.status(500).json({ message: "Failed to load employee damage lookups", error: e.code || e.message });
  }
});

// POST 
router.post("/", async (req, res) => {
  const { user_id, inv_id, damage_status_id, date_reported } = req.body;

  if (!user_id || !inv_id || !damage_status_id) {
    return res.status(400).json({ message: "user_id, inv_id and damage_status_id are required" });
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

    const costNum = calculateDamageFee(inv.item_value, damage_status_id);

    const [r] = await conn.query(
      `
      INSERT INTO employee_damage (user_id, inv_id, cost, date_reported, damage_status_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(user_id),
        Number(inv_id),
        costNum,
        date_reported ?? new Date(),
        Number(damage_status_id),
      ]
    );

    await conn.query(
      `UPDATE inventory SET quantity = quantity - 1 WHERE inv_id = ?`,
      [Number(inv_id)]
    );

    await conn.commit();
    res.status(201).json({ edam_id: r.insertId, cost: costNum });
  } catch (e) {
    await conn.rollback();
    console.error("create employee damage error:", e);
    res.status(400).json({ message: e.message || "Failed to create employee damage" });
  } finally {
    conn.release();
  }
});

// PUT 
router.put("/:id", async (req, res) => {
  const { user_id, inv_id, damage_status_id, date_reported } = req.body;

  if (!user_id || !inv_id || !damage_status_id) {
    return res.status(400).json({ message: "user_id, inv_id and damage_status_id are required" });
  }

  try {
    const [[inv]] = await pool.query(
      `SELECT item_value FROM inventory WHERE inv_id = ?`,
      [Number(inv_id)]
    );

    if (!inv) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const costNum = calculateDamageFee(inv.item_value, damage_status_id);

    const [r] = await pool.query(
      `
      UPDATE employee_damage
      SET user_id=?, inv_id=?, cost=?, date_reported=?, damage_status_id=?
      WHERE edam_id=?
      `,
      [
        Number(user_id),
        Number(inv_id),
        costNum,
        date_reported ?? new Date(),
        Number(damage_status_id),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Employee damage not found" });
    }

    res.json({ updated: r.affectedRows, cost: costNum });
  } catch (e) {
    console.error("update employee damage error:", e);
    res.status(500).json({ message: "Failed to update employee damage", error: e.code || e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM employee_damage WHERE edam_id = ?`,
      [Number(req.params.id)]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Employee damage not found" });
    }

    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete employee damage error:", e);
    res.status(500).json({ message: "Failed to delete employee damage", error: e.code || e.message });
  }
});

module.exports = router;