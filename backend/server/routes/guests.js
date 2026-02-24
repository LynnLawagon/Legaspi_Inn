const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/lookups", async (req, res) => {
  try {
    const [genders] = await pool.query(`SELECT gender_id, gender_name FROM gender ORDER BY gender_id`);
    res.json({ genders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load guest lookups", error: e.code || e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.guest_id, g.guest_name, g.contact, g.age, g.gender_id, ge.gender_name, g.dob
      FROM guests g
      LEFT JOIN gender ge ON ge.gender_id = g.gender_id
      ORDER BY g.guest_id DESC
    `);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch guests", error: e.code || e.message });
  }
});

router.post("/", async (req, res) => {
  const { guest_name, contact, age, gender_id, dob } = req.body;
  if (!guest_name) return res.status(400).json({ message: "guest_name required" });

  try {
    const [r] = await pool.query(
      `INSERT INTO guests (guest_name, contact, age, gender_id, dob)
       VALUES (?, ?, ?, ?, ?)`,
      [String(guest_name).trim(), contact ?? null, age ?? null, gender_id ?? null, dob ?? null]
    );
    res.status(201).json({ guest_id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create guest", error: e.code || e.message });
  }
});

router.put("/:id", async (req, res) => {
  const { guest_name, contact, age, gender_id, dob } = req.body;
  if (!guest_name) return res.status(400).json({ message: "guest_name required" });

  try {
    const [r] = await pool.query(
      `UPDATE guests SET guest_name=?, contact=?, age=?, gender_id=?, dob=? WHERE guest_id=?`,
      [String(guest_name).trim(), contact ?? null, age ?? null, gender_id ?? null, dob ?? null, Number(req.params.id)]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "Guest not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update guest", error: e.code || e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM guests WHERE guest_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Guest not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete guest", error: e.code || e.message });
  }
});

module.exports = router;