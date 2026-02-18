const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * GET /api/dashboard/rooms
 * Returns:
 * - total rooms
 * - counts per status
 * - list of rooms with type + status (for the room list panel)
 */
router.get("/rooms", async (req, res) => {
  try {
    // total rooms
    const [[totalRow]] = await pool.query(`SELECT COUNT(*) AS totalRooms FROM rooms`);

    // counts by status name
    const [statusCounts] = await pool.query(`
      SELECT rs.status_name, COUNT(*) AS count
      FROM rooms r
      JOIN room_status rs ON r.status_id = rs.status_id
      GROUP BY rs.status_id, rs.status_name
      ORDER BY rs.status_id ASC
    `);

    // room list for dashboard panel (room number, status, type, base_rate)
    const [roomList] = await pool.query(`
      SELECT
        r.room_id,
        r.room_number,
        rs.status_name,
        rt.type_name,
        rt.base_rate
      FROM rooms r
      JOIN room_status rs ON r.status_id = rs.status_id
      JOIN room_type rt ON r.room_type_id = rt.room_type_id
      ORDER BY CAST(SUBSTRING(r.room_number, 2) AS UNSIGNED) ASC
      LIMIT 50
    `);

    res.json({
      totalRooms: totalRow.totalRooms,
      statusCounts, // [{status_name, count}, ...]
      roomList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load dashboard rooms data" });
  }
});

module.exports = router;
