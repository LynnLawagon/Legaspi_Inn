const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * rooms:
 * room_id, room_number, room_type_id, room_status_id
 * room_type:
 * room_type_id, type_name, base_rate, capacity
 * room_status:
 * room_status_id, status_name
 */

router.get("/lookups", async (req, res) => {
  try {
    const [types] = await pool.query(
      `SELECT room_type_id, type_name, base_rate, capacity
       FROM room_type
       ORDER BY room_type_id`
    );

    const [statuses] = await pool.query(
      `SELECT room_status_id, status_name
       FROM room_status
       ORDER BY room_status_id`
    );

    res.json({ roomTypes: types, roomStatuses: statuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load lookups" });
  }
});

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.room_id,
        r.room_number,
        r.room_type_id,
        rt.type_name,
        rt.base_rate,
        rt.capacity,
        r.room_status_id,
        rs.status_name
      FROM rooms r
      JOIN room_type rt ON r.room_type_id = rt.room_type_id
      JOIN room_status rs ON r.room_status_id = rs.room_status_id
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED) ASC, r.room_id ASC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

router.post("/", async (req, res) => {
  const { room_number, room_type_id, status_id } = req.body; // frontend sends status_id

  if (!room_number || !room_type_id || !status_id) {
    return res.status(400).json({ message: "room_number, room_type_id, status_id are required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO rooms (room_number, room_type_id, room_status_id)
       VALUES (?, ?, ?)`,
      [String(room_number).trim(), Number(room_type_id), Number(status_id)]
    );

    res.status(201).json({ room_id: result.insertId });
  } catch (err) {
    console.error(err);
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room number already exists" });
    }
    res.status(500).json({ message: "Failed to create room" });
  }
});

router.put("/:id", async (req, res) => {
  const { room_number, room_type_id, status_id } = req.body;

  if (!room_number || !room_type_id || !status_id) {
    return res.status(400).json({ message: "room_number, room_type_id, status_id are required" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE rooms
       SET room_number=?, room_type_id=?, room_status_id=?
       WHERE room_id=?`,
      [String(room_number).trim(), Number(room_type_id), Number(status_id), Number(req.params.id)]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Room not found" });
    res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error(err);
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room number already exists" });
    }
    res.status(500).json({ message: "Failed to update room" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM rooms WHERE room_id=?`, [Number(req.params.id)]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Room not found" });
    res.json({ deleted: result.affectedRows });
  } catch (err) {
    console.error(err);
    if (String(err?.code) === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "Cannot delete: room is used in transactions" });
    }
    res.status(500).json({ message: "Failed to delete room" });
  }
});

module.exports = router;