const express = require("express");
const pool = require("../db");
const router = express.Router();

// GET /api/employee-damage?user_id=2&limit=50
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const userId = req.query.user_id ? Number(req.query.user_id) : null;

    const [rows] = await pool.query(
      `
      SELECT
        ed.edam_id,
        ed.user_id,
        ed.inv_id,
        i.item_name AS inventory_name,
        ed.cost,
        ed.date_reported,
        ed.damage_status_id
      FROM employee_damage ed
      LEFT JOIN inventory i ON i.inv_id = ed.inv_id
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

// GET /api/employee-damage/lookups
router.get("/lookups", async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT user_id, username
      FROM users
      ORDER BY username ASC
    `);

    const [inventory] = await pool.query(`
      SELECT inv_id, item_name, quantity
      FROM inventory
      ORDER BY item_name ASC
    `);

    const [statuses] = await pool.query(`
      SELECT damage_status_id, status_name
      FROM damage_status
      ORDER BY status_name ASC
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

// POST /api/employee-damage
router.post("/", async (req, res) => {
  const { user_id, inv_id, cost, damage_status_id, date_reported } = req.body;

  if (!user_id || !inv_id) {
    return res.status(400).json({ message: "user_id and inv_id required" });
  }

  const costNum = Number(cost || 0);
  if (!Number.isFinite(costNum) || costNum <= 0) {
    return res.status(400).json({ message: "cost must be greater than 0" });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO employee_damage (user_id, inv_id, cost, date_reported, damage_status_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(user_id),
        Number(inv_id),
        costNum,
        date_reported ?? new Date(),
        Number(damage_status_id ?? 1),
      ]
    );

    res.status(201).json({ edam_id: r.insertId });
  } catch (e) {
    console.error("create employee damage error:", e);
    res.status(500).json({ message: "Failed to create employee damage", error: e.code || e.message });
  }
});

// PUT /api/employee-damage/:id
router.put("/:id", async (req, res) => {
  const { user_id, inv_id, cost, damage_status_id, date_reported } = req.body;

  const costNum = Number(cost || 0);
  if (!Number.isFinite(costNum) || costNum <= 0) {
    return res.status(400).json({ message: "cost must be greater than 0" });
  }

  try {
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
        Number(damage_status_id ?? 1),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Employee damage not found" });
    }

    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update employee damage error:", e);
    res.status(500).json({ message: "Failed to update employee damage", error: e.code || e.message });
  }
});

// DELETE /api/employee-damage/:id
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM employee_damage WHERE edam_id=?`,
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