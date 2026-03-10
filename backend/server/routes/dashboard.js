// backend/server/routes/dashboard.js
const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/dashboard/rooms
 * Returns: totalRooms, statusCounts, roomList
 * Uses your actual DB columns:
 * rooms.status_id -> room_status.status_id
 * rooms.room_type_id -> room_type.room_type_id
 */
router.get("/rooms", async (req, res) => {
  try {
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) AS totalRooms FROM rooms"
    );

    const [statusCounts] = await pool.query(
      `
      SELECT rs.status_name, COUNT(*) AS count
      FROM rooms r
      JOIN room_status rs ON rs.status_id = r.status_id
      GROUP BY rs.status_name
      ORDER BY rs.status_name
      `
    );

    const [roomList] = await pool.query(
      `
      SELECT
        r.room_id,
        r.room_number,
        rs.status_name,
        rt.type_name,
        rt.base_rate,
        rt.capacity
      FROM rooms r
      JOIN room_status rs ON rs.status_id = r.status_id
      JOIN room_type rt ON rt.room_type_id = r.room_type_id
      ORDER BY r.room_number ASC, r.room_id ASC
      `
    );

    res.json({
      totalRooms: Number(totalRows?.[0]?.totalRooms || 0),
      statusCounts: Array.isArray(statusCounts) ? statusCounts : [],
      roomList: Array.isArray(roomList) ? roomList : [],
    });
  } catch (err) {
    console.error("Dashboard /rooms error:", err);
    res
      .status(500)
      .json({ ok: false, message: "Server error", error: err.code || err.message });
  }
});

module.exports = router;