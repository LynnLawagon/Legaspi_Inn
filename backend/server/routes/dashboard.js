// routes/dashboard.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * Dashboard.jsx calls:
 * GET /api/dashboard/rooms
 * Returns:
 * {
 *   totalRooms,
 *   statusCounts: [{status_name, count}],
 *   roomList: [{room_id, room_number, status_name, type_name, base_rate}]
 * }
 */
router.get("/rooms", async (req, res) => {
  try {
    const [[total]] = await pool.query(`SELECT COUNT(*) AS totalRooms FROM rooms`);

    const [statusCounts] = await pool.query(`
      SELECT COALESCE(rs.status_name, 'Unknown') AS status_name, COUNT(*) AS count
      FROM rooms r
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
      GROUP BY COALESCE(rs.status_name, 'Unknown')
      ORDER BY status_name
    `);

    const [roomList] = await pool.query(`
      SELECT
        r.room_id,
        r.room_number,
        COALESCE(rs.status_name, 'Unknown') AS status_name,
        COALESCE(rt.type_name, '') AS type_name,
        COALESCE(rt.base_rate, 0) AS base_rate
      FROM rooms r
      LEFT JOIN room_status rs ON rs.room_status_id = r.room_status_id
      LEFT JOIN room_type rt ON rt.room_type_id = r.room_type_id
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED), r.room_id
      LIMIT 50
    `);

    res.json({
      totalRooms: total.totalRooms || 0,
      statusCounts: Array.isArray(statusCounts) ? statusCounts : [],
      roomList: Array.isArray(roomList) ? roomList : [],
    });
  } catch (e) {
    console.error("dashboard/rooms error:", e);
    res.status(500).json({ message: "Failed to load rooms dashboard" });
  }
});

module.exports = router;