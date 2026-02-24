// routes/inventory.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

const THRESHOLD = 100;

// lookups (category + type only; status is computed from quantity)
router.get("/lookups", async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT category_id, category_name FROM inventory_category ORDER BY category_name`
    );
    const [types] = await pool.query(
      `SELECT inv_type_id, type_name FROM inventory_type ORDER BY type_name`
    );

    res.json({ categories, types });
  } catch (e) {
    console.error("inventory/lookups error:", e);
    res.status(500).json({ message: "Failed to load inventory lookups", error: e.code || e.message });
  }
});

// list (status computed from quantity)
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        i.inv_id,
        i.item_name,
        i.category_id,
        COALESCE(c.category_name,'') AS category_name,
        i.inv_type_id,
        COALESCE(t.type_name,'') AS type_name,
        COALESCE(i.quantity,0) AS quantity,
        CASE
          WHEN COALESCE(i.quantity,0) = 0 THEN 'Not available'
          WHEN COALESCE(i.quantity,0) < ? THEN 'Low stock'
          ELSE 'Available'
        END AS status_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      LEFT JOIN inventory_type t ON t.inv_type_id = i.inv_type_id
      ORDER BY i.inv_id DESC
    `, [THRESHOLD]);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory list error:", e);
    res.status(500).json({ message: "Failed to fetch inventory", error: e.code || e.message });
  }
});

// create (NO inv_status_id saved; status is computed)
router.post("/", async (req, res) => {
  const { item_name, category_id, inv_type_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const [r] = await pool.query(
      `INSERT INTO inventory (item_name, category_id, inv_type_id, quantity)
       VALUES (?, ?, ?, ?)`,
      [
        String(item_name).trim(),
        category_id ?? null,
        inv_type_id ?? null,
        Number(quantity ?? 0),
      ]
    );
    res.status(201).json({ inv_id: r.insertId });
  } catch (e) {
    console.error("inventory create error:", e);
    res.status(500).json({ message: "Failed to create inventory item", error: e.code || e.message });
  }
});

// update
router.put("/:id", async (req, res) => {
  const { item_name, category_id, inv_type_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const [r] = await pool.query(
      `UPDATE inventory
       SET item_name=?, category_id=?, inv_type_id=?, quantity=?
       WHERE inv_id=?`,
      [
        String(item_name).trim(),
        category_id ?? null,
        inv_type_id ?? null,
        Number(quantity ?? 0),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("inventory update error:", e);
    res.status(500).json({ message: "Failed to update inventory item", error: e.code || e.message });
  }
});

// delete
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM inventory WHERE inv_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("inventory delete error:", e);
    res.status(500).json({ message: "Failed to delete inventory item", error: e.code || e.message });
  }
});

/**
 * ✅ DASHBOARD: /api/inventory/summary
 * Based on your rule:
 * - Available: qty >= 100
 * - Low stock: 1..99
 * - Out of Stock: 0
 */
router.get("/summary", async (req, res) => {
  try {
    const [[total]] = await pool.query(`SELECT COUNT(*) AS totalItems FROM inventory`);

    const [[available]] = await pool.query(
      `SELECT COUNT(*) AS availableCount
       FROM inventory
       WHERE COALESCE(quantity,0) >= ?`,
      [THRESHOLD]
    );

    const [[low]] = await pool.query(
      `SELECT COUNT(*) AS lowStockCount
       FROM inventory
       WHERE COALESCE(quantity,0) > 0 AND COALESCE(quantity,0) < ?`,
      [THRESHOLD]
    );

    const [[out]] = await pool.query(
      `SELECT COUNT(*) AS outOfStockCount
       FROM inventory
       WHERE COALESCE(quantity,0) = 0`
    );

    res.json({
      totalItems: Number(total.totalItems || 0),
      availableCount: Number(available.availableCount || 0),
      lowStockCount: Number(low.lowStockCount || 0),
      outOfStockCount: Number(out.outOfStockCount || 0),
      threshold: THRESHOLD,
    });
  } catch (e) {
    console.error("inventory/summary error:", e);
    res.status(500).json({ message: "Failed to load inventory summary", error: e.code || e.message });
  }
});

/**
 * ✅ DASHBOARD: /api/inventory/low-stock?limit=10
 * Low stock = 1..99
 */
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));

    const [rows] = await pool.query(
      `
      SELECT
        i.inv_id,
        i.item_name AS name,
        COALESCE(i.quantity,0) AS quantity,
        COALESCE(c.category_name,'') AS category_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      WHERE COALESCE(i.quantity,0) > 0 AND COALESCE(i.quantity,0) < ?
      ORDER BY COALESCE(i.quantity,0) ASC
      LIMIT ?
      `,
      [THRESHOLD, limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory/low-stock error:", e);
    res.status(500).json({ message: "Failed to load low stock items", error: e.code || e.message });
  }
});

module.exports = router;