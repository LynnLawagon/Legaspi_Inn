const express = require("express");
const router = express.Router();
const pool = require("../db");

const THRESHOLD = 100;

/**
 * Helper: get next inv_id
 */
async function getNextInvId(conn) {
  const [rows] = await conn.query(
    "SELECT COALESCE(MAX(inv_id), 0) + 1 AS nextId FROM inventory"
  );
  return rows[0].nextId;
}

/**
 * Helper: build a map of status name -> id from DB
 */
async function getStatusIdMap(conn) {
  const [rows] = await conn.query(
    "SELECT invstat_id, invstat_name FROM inventory_status"
  );

  const map = {};
  for (const r of rows) {
    map[String(r.invstat_name || "").trim().toLowerCase()] = Number(r.invstat_id);
  }
  return map;
}

/**
 * Helper: compute invstat_id using quantity + inventory_status IDs
 */
function computeInvStatId(quantity, statusMap) {
  const q = Number(quantity);

  if (q === 0) return statusMap["out of stock"];
  if (q > 0 && q < THRESHOLD) return statusMap["low stock"];
  return statusMap["available"];
}

/**
 * GET /api/inventory/lookups
 * (We keep statuses in case you want to show the list in UI,
 * but the UI should NOT choose status anymore.)
 */
router.get("/lookups", async (req, res) => {
  try {
    const [categories] = await pool.query(
      "SELECT category_id, category_name FROM inventory_category ORDER BY category_name"
    );
    const [types] = await pool.query(
      "SELECT inv_type_id, type_name FROM inventory_type ORDER BY type_name"
    );
    const [statuses] = await pool.query(
      "SELECT invstat_id, invstat_name FROM inventory_status ORDER BY invstat_name"
    );

    res.json({ categories, types, statuses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load inventory lookups" });
  }
});

/**
 * GET /api/inventory
 * Reads status from inventory_status table (DB is the source of truth)
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        i.inv_id,
        i.name,
        i.quantity,
        i.category_id,
        c.category_name,
        i.inv_type_id,
        t.type_name,
        i.invstat_id,
        s.invstat_name
      FROM inventory i
      JOIN inventory_category c ON i.category_id = c.category_id
      JOIN inventory_type t ON i.inv_type_id = t.inv_type_id
      LEFT JOIN inventory_status s ON i.invstat_id = s.invstat_id
      ORDER BY i.inv_id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

/**
 * GET /api/inventory/summary
 * Dashboard cards based on quantity rules (no need to trust invstat_id here)
 */
router.get("/summary", async (req, res) => {
  try {
    const [[total]] = await pool.query("SELECT COUNT(*) AS totalItems FROM inventory");

    const [[available]] = await pool.query(
      "SELECT COUNT(*) AS availableCount FROM inventory WHERE quantity >= ?",
      [THRESHOLD]
    );

    const [[low]] = await pool.query(
      "SELECT COUNT(*) AS lowStockCount FROM inventory WHERE quantity > 0 AND quantity < ?",
      [THRESHOLD]
    );

    const [[out]] = await pool.query(
      "SELECT COUNT(*) AS outOfStockCount FROM inventory WHERE quantity = 0"
    );

    res.json({
      totalItems: Number(total.totalItems) || 0,
      availableCount: Number(available.availableCount) || 0,
      lowStockCount: Number(low.lowStockCount) || 0,
      outOfStockCount: Number(out.outOfStockCount) || 0,
      threshold: THRESHOLD,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load inventory summary" });
  }
});

/**
 * GET /api/inventory/low-stock?limit=5
 * Items with 1..99 qty (LIMIT works)
 */
router.get("/low-stock", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 50);

  try {
    const [rows] = await pool.query(
      `
      SELECT
        i.inv_id,
        i.name,
        c.category_name,
        t.type_name,
        i.quantity,
        s.invstat_name
      FROM inventory i
      LEFT JOIN inventory_category c ON i.category_id = c.category_id
      LEFT JOIN inventory_type t ON i.inv_type_id = t.inv_type_id
      LEFT JOIN inventory_status s ON i.invstat_id = s.invstat_id
      WHERE i.quantity > 0 AND i.quantity < ?
      ORDER BY i.quantity ASC, i.inv_id ASC
      LIMIT ?
      `,
      [THRESHOLD, limit]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load low stock items" });
  }
});

/**
 * POST /api/inventory
 * IMPORTANT: frontend must NOT send invstat_id
 * We auto-set it here based on quantity.
 */
router.post("/", async (req, res) => {
  const { name, category_id, inv_type_id, quantity } = req.body;

  if (!name || !category_id || !inv_type_id || quantity == null) {
    return res.status(400).json({
      message: "name, category_id, inv_type_id, quantity are required",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const nextId = await getNextInvId(conn);
    const statusMap = await getStatusIdMap(conn);
    const invstat_id = computeInvStatId(quantity, statusMap);

    if (!invstat_id) {
      throw new Error("inventory_status must contain: Available, Low Stock, Out of Stock");
    }

    await conn.query(
      `INSERT INTO inventory (inv_id, name, category_id, inv_type_id, quantity, invstat_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nextId,
        name.trim(),
        Number(category_id),
        Number(inv_type_id),
        Number(quantity),
        Number(invstat_id),
      ]
    );

    await conn.commit();
    res.status(201).json({ inv_id: nextId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to create inventory item" });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/inventory/:id
 * Auto-updates invstat_id if quantity changes
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category_id, inv_type_id, quantity } = req.body;

  if (!name || !category_id || !inv_type_id || quantity == null) {
    return res.status(400).json({
      message: "name, category_id, inv_type_id, quantity are required",
    });
  }

  const conn = await pool.getConnection();
  try {
    const statusMap = await getStatusIdMap(conn);
    const invstat_id = computeInvStatId(quantity, statusMap);

    if (!invstat_id) {
      throw new Error("inventory_status must contain: Available, Low Stock, Out of Stock");
    }

    const [result] = await conn.query(
      `UPDATE inventory
       SET name = ?, category_id = ?, inv_type_id = ?, quantity = ?, invstat_id = ?
       WHERE inv_id = ?`,
      [
        name.trim(),
        Number(category_id),
        Number(inv_type_id),
        Number(quantity),
        Number(invstat_id),
        Number(id),
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Item not found" });

    res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to update inventory item" });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/inventory/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM inventory WHERE inv_id = ?", [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Item not found" });

    res.json({ deleted: result.affectedRows });
  } catch (err) {
    console.error(err);

    if (String(err?.code) === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "Cannot delete: inventory item is used in other records (sales/purchased/damages).",
      });
    }

    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

module.exports = router;
