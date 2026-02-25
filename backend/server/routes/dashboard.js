// backend/server/routes/dashboard.js
const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/dashboard/rooms
 * FIX: use correct table names room_type (not room_types) and
 *      correct join columns room_status_id / room_type_id
 */
router.get("/rooms", async (req, res) => {
  try {
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) AS totalRooms FROM rooms"
    );

    // FIX: rooms.room_status_id → room_status.room_status_id
    const [statusCounts] = await pool.query(
      `
      SELECT rs.status_name, COUNT(*) AS count
      FROM rooms r
      JOIN room_status rs ON rs.room_status_id = r.room_status_id
      GROUP BY rs.status_name
      ORDER BY rs.status_name
      `
    );

    // FIX: join on room_type_id (not type_id), table name room_type (not room_types)
    const [roomList] = await pool.query(
      `
      SELECT
        r.room_id,
        r.room_number,
        rs.status_name,
        rt.type_name,
        rt.base_rate
      FROM rooms r
      JOIN room_status rs ON rs.room_status_id = r.room_status_id
      JOIN room_type rt ON rt.room_type_id = r.room_type_id
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED) ASC, r.room_id ASC
      `
    );

    res.json({
      totalRooms: Number(totalRows?.[0]?.totalRooms || 0),
      statusCounts,
      roomList,
    });
  } catch (err) {
    console.error("Dashboard /rooms error:", err);
    res.status(500).json({ ok: false, message: "Server error", error: err.code || err.message });
  }
});

module.exports = router;