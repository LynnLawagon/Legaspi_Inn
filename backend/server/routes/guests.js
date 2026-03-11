const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * GET /api/guests?q=
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let sql = `
      SELECT
        g.guest_id,
        g.guest_name,
        g.contact,
        g.age,
        g.gender_id,
        gn.gender_name,
        DATE_FORMAT(g.dob, '%Y-%m-%d') AS dob
      FROM guests g
      LEFT JOIN gender gn ON gn.gender_id = g.gender_id
    `;

    const params = [];

    if (q) {
      sql += `
        WHERE g.guest_name LIKE ?
           OR g.contact LIKE ?
           OR gn.gender_name LIKE ?
           OR DATE_FORMAT(g.dob, '%Y-%m-%d') LIKE ?
           OR CAST(g.age AS CHAR) LIKE ?
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY g.guest_id DESC`;

    const [rows] = await pool.query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("guests list error:", e);
    res.status(500).json({ message: "Failed to fetch guests", error: e.code || e.message });
  }
});

/**
 * GET /api/guests/lookups
 */
router.get("/lookups", async (req, res) => {
  try {
    const [genders] = await pool.query(
      `SELECT gender_id, gender_name FROM gender ORDER BY gender_name ASC`
    );

    res.json({ genders: Array.isArray(genders) ? genders : [] });
  } catch (e) {
    console.error("guests lookups error:", e);
    res.status(500).json({ message: "Failed to load lookups", error: e.code || e.message });
  }
});

/**
 * POST /api/guests
 */
router.post("/", async (req, res) => {
  const { guest_name, contact, age, gender_id, dob } = req.body;

  if (!guest_name || !contact || !gender_id || !dob) {
    return res.status(400).json({ message: "guest_name, contact, gender_id, dob are required" });
  }

  try {
    const [r] = await pool.query(
      `INSERT INTO guests (guest_name, contact, age, gender_id, dob) VALUES (?, ?, ?, ?, ?)`,
      [
        String(guest_name).trim(),
        String(contact).trim(),
        age == null || age === "" ? null : Number(age),
        Number(gender_id),
        dob,
      ]
    );

    res.status(201).json({ guest_id: r.insertId });
  } catch (e) {
    console.error("create guest error:", e);
    res.status(500).json({ message: "Failed to create guest", error: e.code || e.message });
  }
});

/**
 * PUT /api/guests/:id
 */
router.put("/:id", async (req, res) => {
  const { guest_name, contact, age, gender_id, dob } = req.body;

  try {
    const [r] = await pool.query(
      `UPDATE guests SET guest_name=?, contact=?, age=?, gender_id=?, dob=? WHERE guest_id=?`,
      [
        String(guest_name).trim(),
        String(contact).trim(),
        age == null || age === "" ? null : Number(age),
        Number(gender_id),
        dob,
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Guest not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update guest error:", e);
    res.status(500).json({ message: "Failed to update guest", error: e.code || e.message });
  }
});

/**
 * DELETE /api/guests/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM guests WHERE guest_id=?`, [Number(req.params.id)]);

    if (r.affectedRows === 0) return res.status(404).json({ message: "Guest not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete guest error:", e);
    res.status(500).json({ message: "Failed to delete guest", error: e.code || e.message });
  }
});

module.exports = router;