const express = require("express");
const pool = require("../db");
const router = express.Router();

// GET /api/damages?limit=10
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);

    const [rows] = await pool.query(
      `
      SELECT
        gd.gdam_id,
        gd.trans_id,
        gd.inv_id,
        i.item_name,
        ds.status_name AS damage_status,
        gd.charge_amount,
        g.guest_name,
        r.room_number,
        gd.date_reported
      FROM guest_damage gd
      LEFT JOIN inventory i ON i.inv_id = gd.inv_id
      LEFT JOIN damage_status ds ON ds.damage_status_id = gd.damage_status_id
      LEFT JOIN transactions t ON t.trans_id = gd.trans_id
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      ORDER BY gd.gdam_id DESC
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
  const { trans_id, inv_id, charge_amount, damage_status_id, date_reported } = req.body;

  if (!trans_id || !inv_id) {
    return res.status(400).json({ message: "trans_id and inv_id required" });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO guest_damage (trans_id, inv_id, charge_amount, date_reported, damage_status_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(trans_id),
        Number(inv_id),
        Number(charge_amount ?? 0),
        date_reported ?? new Date(),
        Number(damage_status_id ?? 1),
      ]
    );

    res.status(201).json({ gdam_id: r.insertId });
  } catch (e) {
    console.error("create damage error:", e);
    res.status(500).json({ message: "Failed to create damage", error: e.code || e.message });
  }
});

// PUT /api/damages/:id
router.put("/:id", async (req, res) => {
  const { trans_id, inv_id, charge_amount, damage_status_id, date_reported } = req.body;

  try {
    const [r] = await pool.query(
      `
      UPDATE guest_damage
      SET trans_id=?, inv_id=?, charge_amount=?, date_reported=?, damage_status_id=?
      WHERE gdam_id=?
      `,
      [
        Number(trans_id),
        Number(inv_id),
        Number(charge_amount ?? 0),
        date_reported ?? new Date(),
        Number(damage_status_id ?? 1),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Damage not found" });
    }

    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update damage error:", e);
    res.status(500).json({ message: "Failed to update damage", error: e.code || e.message });
  }
});

// DELETE /api/damages/:id
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM guest_damage WHERE gdam_id=?`,
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