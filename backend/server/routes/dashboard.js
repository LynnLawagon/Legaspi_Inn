// routes/dashboard.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/rooms", async (req, res) => {
  try {
    const [[total]] = await pool.query(`SELECT COUNT(*) AS totalRooms FROM rooms`);

    // default fallback
    let statusCounts = [];
    let roomList = [];

    // Try statusCounts
    try {
      const [rows] = await pool.query(`
        SELECT COALESCE(rs.status_name, 'Unknown') AS status_name, COUNT(*) AS count
        FROM rooms r
        LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
        GROUP BY COALESCE(rs.status_name, 'Unknown')
        ORDER BY status_name
      `);
      statusCounts = Array.isArray(rows) ? rows : [];
    } catch (e) {
      // fallback: group by room_status_id if room_status table missing
      const [rows] = await pool.query(`
        SELECT CONCAT('Status ', COALESCE(room_status_id, 0)) AS status_name, COUNT(*) AS count
        FROM rooms
        GROUP BY COALESCE(room_status_id, 0)
        ORDER BY status_name
      `);
      statusCounts = Array.isArray(rows) ? rows : [];
    }

    // Try roomList
    try {
      const [rows] = await pool.query(`
        SELECT
          r.room_id,
          r.room_number,
          COALESCE(rs.status_name, 'Unknown') AS status_name,
          COALESCE(rt.type_name, '') AS type_name,
          COALESCE(rt.base_rate, 0) AS base_rate
        FROM rooms r
        LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
        LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
        ORDER BY r.room_id DESC
        LIMIT 50
      `);
      roomList = Array.isArray(rows) ? rows : [];
    } catch (e) {
      // fallback if room_status missing
      const [rows] = await pool.query(`
        SELECT
          r.room_id,
          r.room_number,
          CONCAT('Status ', COALESCE(r.room_status_id,0)) AS status_name,
          COALESCE(rt.type_name, '') AS type_name,
          COALESCE(rt.base_rate, 0) AS base_rate
        FROM rooms r
        LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
        ORDER BY r.room_id DESC
        LIMIT 50
      `);
      roomList = Array.isArray(rows) ? rows : [];
    }

    res.json({
      totalRooms: total.totalRooms || 0,
      statusCounts,
      roomList,
    });
  } catch (e) {
    console.error("dashboard/rooms error:", e);
    res.status(500).json({ message: "Failed to load rooms dashboard", error: e.code || e.message });
  }
});

module.exports = router;