//backend/server/routes/inventory.js
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
  // default threshold = 50
  const t = Number(req.query.threshold ?? 50);
  return Number.isFinite(t) && t >= 1 ? t : 50;
}

/**
 * GET /api/inventory?q=&threshold=50
 * List inventory with computed status (invstat_name)
 */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const threshold = getThreshold(req);

    let sql = `
      SELECT
        i.inv_id,
        i.name,
        i.quantity,
        i.category_id,
        i.inv_type_id,
        i.invstat_id,

        c.category_name,
        t.type_name,

        CASE
          WHEN COALESCE(i.quantity,0) = 0 THEN 'Out of Stock'
          WHEN COALESCE(i.quantity,0) < ? THEN 'Low Stock'
          ELSE 'Available'
        END AS invstat_name

      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      LEFT JOIN inventory_type t ON t.inv_type_id = i.inv_type_id
    `;

    const params = [threshold];

    if (q) {
      sql += `
        WHERE i.name LIKE ?
           OR c.category_name LIKE ?
           OR t.type_name LIKE ?
      `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY i.inv_id DESC`;

    const [rows] = await pool.query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory list error:", e);
    res.status(500).json({ message: "Failed to fetch inventory", error: e.code || e.message });
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
      `SELECT invstat_id, invstat_name FROM inventory_status ORDER BY invstat_name ASC`
    );

    res.json({
      categories: Array.isArray(categories) ? categories : [],
      types: Array.isArray(types) ? types : [],
      statuses: Array.isArray(statuses) ? statuses : [],
    });
  } catch (e) {
    console.error("inventory lookups error:", e);
    res.status(500).json({ message: "Failed to load inventory lookups", error: e.code || e.message });
  }
});

/**
 * GET /api/inventory/low-stock?limit=50&threshold=50
 * Low stock = 1..(threshold-1)
 */
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Math.max(1, Number(req.query.limit || 10));
    const threshold = getThreshold(req);

    const [rows] = await pool.query(
      `
      SELECT
        i.inv_id,
        i.name,
        i.quantity,
        c.category_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      WHERE COALESCE(i.quantity,0) BETWEEN 1 AND ?
      ORDER BY i.quantity ASC, i.inv_id DESC
      LIMIT ?
      `,
      [threshold - 1, limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory low-stock error:", e);
    res.status(500).json({ message: "Failed to fetch low stock items", error: e.code || e.message });
  }
});

/**
 * GET /api/inventory/summary?threshold=50
 */
router.get("/summary", async (req, res) => {
  try {
    const threshold = getThreshold(req);

    const [totalItemsRow] = await pool.query(
      "SELECT COUNT(*) AS total FROM inventory"
    );

    const [availableRow] = await pool.query(
      "SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity,0) >= ?",
      [threshold]
    );

    const [lowRow] = await pool.query(
      "SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity,0) BETWEEN 1 AND ?",
      [threshold - 1]
    );

    const [outRow] = await pool.query(
      "SELECT COUNT(*) AS total FROM inventory WHERE COALESCE(quantity,0) = 0"
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
    res.status(500).json({ message: "Failed to load inventory summary", error: e.code || e.message });
  }
});

/**
 * POST /api/inventory
 */
router.post("/", async (req, res) => {
  const { name, category_id, inv_type_id, quantity, invstat_id } = req.body;

  if (!name || !category_id || !inv_type_id || invstat_id == null) {
    return res.status(400).json({
      message: "name, category_id, inv_type_id, invstat_id are required",
    });
  }

  try {
    const [r] = await pool.query(
      `
      INSERT INTO inventory (name, category_id, inv_type_id, quantity, invstat_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        Number(category_id),
        Number(inv_type_id),
        Number(quantity ?? 0),
        Number(invstat_id),
      ]
    );

    res.status(201).json({ inv_id: r.insertId });
  } catch (e) {
    console.error("create inventory error:", e);
    res.status(500).json({ message: "Failed to create inventory item", error: e.code || e.message });
  }
});

/**
 * PUT /api/inventory/:id
 */
router.put("/:id", async (req, res) => {
  const { name, category_id, inv_type_id, quantity, invstat_id } = req.body;

  try {
    const [r] = await pool.query(
      `
      UPDATE inventory
      SET name=?, category_id=?, inv_type_id=?, quantity=?, invstat_id=?
      WHERE inv_id=?
      `,
      [
        String(name).trim(),
        Number(category_id),
        Number(inv_type_id),
        Number(quantity ?? 0),
        Number(invstat_id),
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error("update inventory error:", e);
    res.status(500).json({ message: "Failed to update inventory item", error: e.code || e.message });
  }
});

/**
 * DELETE /api/inventory/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM inventory WHERE inv_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error("delete inventory error:", e);
    res.status(500).json({ message: "Failed to delete inventory item", error: e.code || e.message });
  }
});

module.exports = router;