const express = require("express");
const router = express.Router();
const pool = require("../db");

async function getNextInvId(conn) {
  const [rows] = await conn.query(
    "SELECT COALESCE(MAX(inv_id), 0) + 1 AS nextId FROM inventory"
  );
  return rows[0].nextId;
}

/**
 * GET /api/inventory/lookups
 * For dropdowns (category, type, status)
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
 * ✅ NEW: GET /api/inventory/summary
 * For dashboard cards
 */
/**
 * GET /api/inventory/summary
 * Rules:
 * - available >= 100
 * - low stock 1..99
 * - out of stock = 0
 */
router.get("/summary", async (req, res) => {
  try {
    const THRESHOLD = 100;

    const [[total]] = await pool.query(
      "SELECT COUNT(*) AS totalItems FROM inventory"
    );

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
 * Returns items with 1..99 qty
 */
router.get("/low-stock", async (req, res) => {
  const THRESHOLD = 100;
  const limit = Math.min(Number(req.query.limit) || 5, 50);

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        i.inv_id,
        i.name,
        i.quantity,
        c.category_name,
        t.type_name
      FROM inventory i
      JOIN inventory_category c ON i.category_id = c.category_id
      JOIN inventory_type t ON i.inv_type_id = t.inv_type_id
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
 * GET /api/inventory
 * Inventory list with joins
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
        CASE
          WHEN i.quantity >= 100 THEN 'Available'
          WHEN i.quantity > 0 AND i.quantity < 100 THEN 'Low Stock'
          ELSE 'Out of Stock'
        END AS invstat_name
      FROM inventory i
      JOIN inventory_category c ON i.category_id = c.category_id
      JOIN inventory_type t ON i.inv_type_id = t.inv_type_id
      ORDER BY i.inv_id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

/**
 * POST /api/inventory
 * Body: { name, category_id, inv_type_id, quantity, invstat_id }
 */
router.post("/", async (req, res) => {
  const { name, category_id, inv_type_id, quantity, invstat_id } = req.body;

  if (!name || !category_id || !inv_type_id || quantity == null || !invstat_id) {
    return res.status(400).json({
      message: "name, category_id, inv_type_id, quantity, invstat_id are required",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const nextId = await getNextInvId(conn);

    await conn.query(
      `INSERT INTO inventory (inv_id, name, category_id, inv_type_id, quantity, invstat_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nextId, name.trim(), Number(category_id), Number(inv_type_id), Number(quantity), Number(invstat_id)]
    );

    await conn.commit();
    res.status(201).json({ inv_id: nextId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to create inventory item" });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/inventory/:id
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category_id, inv_type_id, quantity, invstat_id } = req.body;

  if (!name || !category_id || !inv_type_id || quantity == null || !invstat_id) {
    return res.status(400).json({
      message: "name, category_id, inv_type_id, quantity, invstat_id are required",
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE inventory
       SET name = ?, category_id = ?, inv_type_id = ?, quantity = ?, invstat_id = ?
       WHERE inv_id = ?`,
      [name.trim(), Number(category_id), Number(inv_type_id), Number(quantity), Number(invstat_id), id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Item not found" });

    res.json({ updated: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

/**
 * DELETE /api/inventory/:id
 * May fail if item is referenced by sales_details/purchased_details/damage tables.
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
