const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * RULE:
 * qty = 0 => Out of Stock
 * qty < 50 => Low Stock
 * qty >= 50 => Available
 */

function getThreshold(req) {
  const t = Number(req.query.threshold ?? 50);
  return Number.isFinite(t) && t >= 1 ? t : 50;
}

/**
 * GET /api/inventory?q=&threshold=50
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const threshold = getThreshold(req);

    let sql = `
      SELECT
        i.inv_id,
        i.item_name,
        i.quantity,
        i.item_value,
        i.category_id,
        i.inv_type_id,
        i.inv_status_id,
        c.category_name,
        t.type_name,
        s.status_name,
        CASE
          WHEN COALESCE(i.quantity, 0) = 0 THEN 'Out of Stock'
          WHEN COALESCE(i.quantity, 0) < ? THEN 'Low Stock'
          ELSE 'Available'
        END AS computed_status
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      LEFT JOIN inventory_type t ON t.inv_type_id = i.inv_type_id
      LEFT JOIN inventory_status s ON s.inv_status_id = i.inv_status_id
    `;

    const params = [threshold];

    if (q) {
      sql += `
        WHERE i.item_name LIKE ?
           OR c.category_name LIKE ?
           OR t.type_name LIKE ?
           OR s.status_name LIKE ?
           OR CAST(i.item_value AS CHAR) LIKE ?
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY i.inv_id DESC`;

    const [rows] = await pool.query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory list error:", e);
    res.status(500).json({
      message: "Failed to fetch inventory",
      error: e.code || e.message,
    });
  }
});

/**
 * GET /api/inventory/lookups
 */
router.get("/lookups", async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT category_id, category_name FROM inventory_category ORDER BY category_name ASC`
    );

    const [types] = await pool.query(
      `SELECT inv_type_id, type_name FROM inventory_type ORDER BY type_name ASC`
    );

    const [statuses] = await pool.query(
      `SELECT inv_status_id, status_name FROM inventory_status ORDER BY status_name ASC`
    );

    res.json({
      categories: Array.isArray(categories) ? categories : [],
      types: Array.isArray(types) ? types : [],
      statuses: Array.isArray(statuses) ? statuses : [],
    });
  } catch (e) {
    console.error("inventory lookups error:", e);
    res.status(500).json({
      message: "Failed to load inventory lookups",
      error: e.code || e.message,
    });
  }
});

/**
 * GET /api/inventory/low-stock?limit=50&threshold=50
 */
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit || 10));
    const threshold = getThreshold(req);

    const [rows] = await pool.query(
      `
      SELECT
        i.inv_id,
        i.item_name,
        i.quantity,
        i.item_value,
        c.category_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      WHERE COALESCE(i.quantity, 0) BETWEEN 1 AND ?
      ORDER BY i.quantity ASC, i.inv_id DESC
      LIMIT ?
      `,
      [threshold - 1, limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory low-stock error:", e);
    res.status(500).json({
      message: "Failed to fetch low stock items",
      error: e.code || e.message,
    });
  }
});

/**
 * GET /api/inventory/summary?threshold=50
 */
router.get("/summary", async (req, res) => {
  try {
    const threshold = getThreshold(req);

    const [totalItemsRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory`
    );

    const [availableRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity, 0) >= ?`,
      [threshold]
    );

    const [lowRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity, 0) BETWEEN 1 AND ?`,
      [threshold - 1]
    );

    const [outRow] = await pool.query(
      `SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity, 0) = 0`
    );

    res.json({
      totalItems: Number(totalItemsRow?.[0]?.total || 0),
      availableCount: Number(availableRow?.[0]?.total || 0),
      lowStockCount: Number(lowRow?.[0]?.total || 0),
      outOfStockCount: Number(outRow?.[0]?.total || 0),
      threshold,
    });
  } catch (e) {
    console.error("inventory summary error:", e);
    res.status(500).json({
      message: "Failed to load inventory summary",
      error: e.code || e.message,
    });
  }
});

/**
 * POST /api/inventory
 */
router.post("/", async (req, res) => {
  const {
    item_name,
    category_id,
    inv_type_id,
    quantity,
    item_value,
    inv_status_id,
  } = req.body;

  if (!item_name || !category_id || !inv_type_id || inv_status_id == null) {
    return res.status(400).json({
      message: "item_name, category_id, inv_type_id, inv_status_id are required",
    });
  }

  const qtyNum = Number(quantity ?? 0);
  const valueNum = Number(item_value ?? 0);

  if (!Number.isFinite(qtyNum) || qtyNum < 0) {
    return res.status(400).json({ message: "quantity must be a valid non-negative number" });
  }

  if (!Number.isFinite(valueNum) || valueNum < 0) {
    return res.status(400).json({ message: "item_value must be a valid non-negative number" });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO inventory
      (item_name, category_id, inv_type_id, quantity, item_value, inv_status_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        String(item_name).trim(),
        Number(category_id),
        Number(inv_type_id),
        qtyNum,
        valueNum,
        Number(inv_status_id),
      ]
    );

    res.status(201).json({ inv_id: r.insertId });
  } catch (e) {
    console.error("create inventory error:", e);
    res.status(500).json({
      message: "Failed to create inventory item",
      error: e.code || e.message,
    });
  }
});

/**
 * PUT /api/inventory/:id
 */
router.put("/:id", async (req, res) => {
  const {
    item_name,
    category_id,
    inv_type_id,
    quantity,
    item_value,
    inv_status_id,
  } = req.body;

  const qtyNum = Number(quantity ?? 0);
  const valueNum = Number(item_value ?? 0);

  if (!Number.isFinite(qtyNum) || qtyNum < 0) {
    return res.status(400).json({ message: "quantity must be a valid non-negative number" });
  }

  if (!Number.isFinite(valueNum) || valueNum < 0) {
    return res.status(400).json({ message: "item_value must be a valid non-negative number" });
  }

  try {
    const [r] = await pool.query(
      `
      UPDATE inventory
      SET item_name=?, category_id=?, inv_type_id=?, quantity=?, item_value=?, inv_status_id=?
      WHERE inv_id=?
      `,
      [
        String(item_name).trim(),
        Number(category_id),
        Number(inv_type_id),
        qtyNum,
        valueNum,
        Number(inv_status_id),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update inventory error:", e);
    res.status(500).json({
      message: "Failed to update inventory item",
      error: e.code || e.message,
    });
  }
});

/**
 * DELETE /api/inventory/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM inventory WHERE inv_id=?`,
      [Number(req.params.id)]
    );

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete inventory error:", e);
    res.status(500).json({
      message: "Failed to delete inventory item",
      error: e.code || e.message,
    });
  }
});

module.exports = router;