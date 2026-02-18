const express = require("express");
const router = express.Router();
const pool = require("../db");

async function getNextGuestId(conn) {
  const [rows] = await conn.query(
    "SELECT COALESCE(MAX(guest_id), 0) + 1 AS nextId FROM guests"
  );
  return rows[0].nextId;
}

/**
 * GET /api/guests/lookups
 * for dropdowns (gender)
 */
router.get("/lookups", async (req, res) => {
  try {
    const [genders] = await pool.query(
      "SELECT gender_id, gender_name FROM gender ORDER BY gender_name"
    );
    res.json({ genders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load guest lookups" });
  }
});

/**
 * GET /api/guests
 * list guests with gender name
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        g.guest_id,
        g.name,
        g.contact,
        g.gender_id,
        ge.gender_name,
        DATE_FORMAT(g.dob, '%Y-%m-%d') AS dob
      FROM guests g
      JOIN gender ge ON g.gender_id = ge.gender_id
      ORDER BY g.guest_id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch guests" });
  }
});

/**
 * POST /api/guests
 * body: { name, contact, gender_id, dob }
 */
router.post("/", async (req, res) => {
  const { name, contact, gender_id, dob } = req.body;

  if (!name || !contact || !gender_id || !dob) {
    return res.status(400).json({
      message: "name, contact, gender_id, dob are required",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const nextId = await getNextGuestId(conn);

    await conn.query(
      `INSERT INTO guests (guest_id, name, contact, gender_id, dob)
       VALUES (?, ?, ?, ?, ?)`,
      [nextId, name.trim(), contact.trim(), Number(gender_id), dob]
    );

    await conn.commit();
    res.status(201).json({ guest_id: nextId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to create guest" });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/guests/:id
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, contact, gender_id, dob } = req.body;

  if (!name || !contact || !gender_id || !dob) {
    return res.status(400).json({
      message: "name, contact, gender_id, dob are required",
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE guests
       SET name = ?, contact = ?, gender_id = ?, dob = ?
       WHERE guest_id = ?`,
      [name.trim(), contact.trim(), Number(gender_id), dob, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update guest" });
  }
});

/**
 * DELETE /api/guests/:id
 * may fail if referenced in transactions
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM guests WHERE guest_id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ deleted: result.affectedRows });
  } catch (err) {
    console.error(err);

    if (String(err?.code) === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Cannot delete: guest is used in other records (transactions).",
      });
    }

    res.status(500).json({ message: "Failed to delete guest" });
  }
});

module.exports = router;
