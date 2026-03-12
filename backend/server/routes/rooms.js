const express = require("express");
const pool = require("../db");
const router = express.Router();

//GET
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let sql = `
      SELECT
        r.room_id,
        r.room_number,
        r.room_type_id,
        r.room_status_id,
        rt.type_name,
        rt.base_rate,
        rt.capacity,
        rs.status_name
      FROM rooms r
      LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
    `;

    const params = [];

    if (q) {
      sql += `
        WHERE r.room_number LIKE ?
           OR rt.type_name LIKE ?
           OR rs.status_name LIKE ?
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY r.room_number ASC, r.room_id ASC`;

    const [rows] = await pool.query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("rooms list error:", e);
    res.status(500).json({ message: "Failed to fetch rooms", error: e.code || e.message });
  }
});

//GET
router.get("/lookups", async (req, res) => {
  try {
    const [types] = await pool.query(
      `SELECT room_type_id, type_name, base_rate, capacity FROM room_type ORDER BY type_name ASC`
    );
    const [statuses] = await pool.query(
      `SELECT room_status_id, status_name FROM room_status ORDER BY status_name ASC`
    );

    res.json({
      types: Array.isArray(types) ? types : [],
      statuses: Array.isArray(statuses) ? statuses : [],
    });
  } catch (e) {
    console.error("rooms lookups error:", e);
    res.status(500).json({ message: "Failed to load lookups", error: e.code || e.message });
  }
});

//POST
router.post("/", async (req, res) => {
  const { room_number, room_type_id, room_status_id } = req.body;

  if (!room_number || !room_type_id || !room_status_id) {
    return res.status(400).json({ message: "room_number, room_type_id, room_status_id are required" });
  }

  try {
    const [r] = await pool.query(
      `INSERT INTO rooms (room_number, room_type_id, room_status_id) VALUES (?, ?, ?)`,
      [String(room_number).trim(), Number(room_type_id), Number(room_status_id)]
    );

    res.status(201).json({ room_id: r.insertId });
  } catch (e) {
    console.error("create room error:", e);
    res.status(500).json({ message: "Failed to create room", error: e.code || e.message });
  }
});

//PUT
router.put("/:id", async (req, res) => {
  const { room_number, room_type_id, room_status_id } = req.body;

  try {
    const [r] = await pool.query(
      `UPDATE rooms SET room_number=?, room_type_id=?, room_status_id=? WHERE room_id=?`,
      [String(room_number).trim(), Number(room_type_id), Number(room_status_id), Number(req.params.id)]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Room not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update room error:", e);
    res.status(500).json({ message: "Failed to update room", error: e.code || e.message });
  }
});

//DELETE
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM rooms WHERE room_id=?`, [Number(req.params.id)]);

    if (r.affectedRows === 0) return res.status(404).json({ message: "Room not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete room error:", e);
    res.status(500).json({ message: "Failed to delete room", error: e.code || e.message });
  }
});

module.exports = router;