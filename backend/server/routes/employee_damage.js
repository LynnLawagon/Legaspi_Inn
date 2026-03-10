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
        ed.inventory_id,
        i.name AS inventory_name,
        ed.cost,
        ed.date_reported,
        ed.status_id
      FROM employee_damage ed
      LEFT JOIN inventory i ON i.inv_id = ed.inventory_id
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

// POST /api/employee-damage
router.post("/", async (req, res) => {
  const { user_id, inventory_id, cost, status_id, date_reported } = req.body;

  if (!user_id || !inventory_id) {
    return res.status(400).json({ message: "user_id and inventory_id required" });
  }

  const costNum = Number(cost || 0);
  if (!Number.isFinite(costNum) || costNum <= 0) {
    return res.status(400).json({ message: "cost must be greater than 0" });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO employee_damage (user_id, inventory_id, cost, date_reported, status_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(user_id),
        Number(inventory_id),
        costNum,
        date_reported ?? new Date(),
        Number(status_id ?? 1),
      ]
    );

    res.status(201).json({ edam_id: r.insertId });
  } catch (e) {
    console.error("create employee damage error:", e);
    res.status(500).json({ message: "Failed to create employee damage", error: e.code || e.message });
  }
});

module.exports = router;