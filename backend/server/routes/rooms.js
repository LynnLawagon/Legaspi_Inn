const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * Helpers:
 * rooms has PK room_id (NOT auto_increment in your schema),
 * so we will generate next id = MAX(room_id)+1
 */

async function getNextRoomId(conn) {
  const [rows] = await conn.query("SELECT COALESCE(MAX(room_id), 0) + 1 AS nextId FROM rooms");
  return rows[0].nextId;
}

/**
 * GET /api/rooms/lookups
 * For dropdowns: room_type and room_status
 */
router.get("/lookups", async (req, res) => {
  try {
    const [types] = await pool.query(
      "SELECT room_type_id, type_name, base_rate, capacity FROM room_type ORDER BY type_name"
    );
    const [statuses] = await pool.query(
      "SELECT status_id, status_name FROM room_status ORDER BY status_name"
    );
    res.json({ roomTypes: types, roomStatuses: statuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load lookups" });
  }
});

/**
 * GET /api/rooms
 * Returns rooms with JOIN names (type + status)
 */
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
        r.status_id,
        rs.status_name
      FROM rooms r
      JOIN room_type rt ON r.room_type_id = rt.room_type_id
      JOIN room_status rs ON r.status_id = rs.status_id
      ORDER BY r.room_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
});

/**
 * GET /api/rooms/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT room_id, room_number, room_type_id, status_id FROM rooms WHERE room_id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Room not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch room" });
  }
});

/**
 * POST /api/rooms
 * Body: { room_number, room_type_id, status_id }
 */
router.post("/", async (req, res) => {
  const { room_number, room_type_id, status_id } = req.body;

  if (!room_number || !room_type_id || !status_id) {
    return res.status(400).json({ message: "room_number, room_type_id, status_id are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const nextId = await getNextRoomId(conn);

    await conn.query(
      `INSERT INTO rooms (room_id, room_number, room_type_id, status_id)
       VALUES (?, ?, ?, ?)`,
      [nextId, room_number, room_type_id, status_id]
    );

    await conn.commit();
    res.status(201).json({ room_id: nextId });
  } catch (err) {
    await conn.rollback();
    console.error(err);

    // Handle duplicate room_number
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Room number already exists" });
    }

    res.status(500).json({ message: "Failed to create room" });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/rooms/:id
 * Body: { room_number, room_type_id, status_id }
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { room_number, room_type_id, status_id } = req.body;

  if (!room_number || !room_type_id || !status_id) {
    return res.status(400).json({ message: "room_number, room_type_id, status_id are required" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE rooms
       SET room_number = ?, room_type_id = ?, status_id = ?
       WHERE room_id = ?`,
      [room_number, room_type_id, status_id, id]
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

/**
 * DELETE /api/rooms/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // NOTE: You have transactions.room_id FK referencing rooms.room_id
    // If a room is used in transactions, delete will fail unless you remove/handle those first.
    const [result] = await pool.query(`DELETE FROM rooms WHERE room_id = ?`, [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Room not found" });

    res.json({ deleted: result.affectedRows });
  } catch (err) {
    console.error(err);

    // Foreign key constraint error
    if (String(err?.code) === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "Cannot delete: room is used in transactions" });
    }

    res.status(500).json({ message: "Failed to delete room" });
  }
});

module.exports = router;
