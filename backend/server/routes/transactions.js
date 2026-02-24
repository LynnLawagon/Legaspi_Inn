const express = require("express");
const pool = require("../db");
const router = express.Router();

// lookups for New Transaction modal
router.get("/lookups", async (req, res) => {
  try {
    const [guests] = await pool.query(`SELECT guest_id, guest_name FROM guests ORDER BY guest_name`);
    const [users] = await pool.query(`SELECT user_id, username, full_name FROM users ORDER BY user_id DESC`);
    const [rooms] = await pool.query(`
      SELECT r.room_id, r.room_number, rt.type_name, rt.base_rate
      FROM rooms r
      JOIN room_type rt ON rt.room_type_id = r.room_type_id
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED), r.room_id
    `);

    res.json({ guests, users, rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load transaction lookups" });
  }
});

// list
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
        t.trans_status_id, ts.status_name AS trans_status_name
      FROM transactions t
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN users u ON u.user_id = t.user_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      LEFT JOIN transaction_status ts ON ts.trans_status_id = t.trans_status_id
      ORDER BY t.trans_id DESC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// create
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
    console.error(e);
    res.status(500).json({ message: "Failed to create transaction" });
  }
});

// update
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
    console.error(e);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

// delete
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM transactions WHERE trans_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Transaction not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

module.exports = router;