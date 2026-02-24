const express = require("express");
const pool = require("../db");
const router = express.Router();

// lookups for modal dropdowns
router.get("/lookups", async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT category_id, category_name FROM inventory_category ORDER BY category_name`
    );
    res.json({ categories });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load inventory lookups" });
  }
});

// list
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        i.inv_id,
        i.item_name,
        i.category_id,
        c.category_name,
        i.quantity
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      ORDER BY i.inv_id DESC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// create
router.post("/", async (req, res) => {
  const { item_name, category_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const [r] = await pool.query(
      `INSERT INTO inventory (item_name, category_id, quantity)
       VALUES (?, ?, ?)`,
      [String(item_name).trim(), category_id ?? null, Number(quantity ?? 0)]
    );
    res.status(201).json({ inv_id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

// update
router.put("/:id", async (req, res) => {
  const { item_name, category_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const [r] = await pool.query(
      `UPDATE inventory
       SET item_name=?, category_id=?, quantity=?
       WHERE inv_id=?`,
      [String(item_name).trim(), category_id ?? null, Number(quantity ?? 0), Number(req.params.id)]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

// delete
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM inventory WHERE inv_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

// ✅ used by dashboard cards
router.get("/summary", async (req, res) => {
  try {
    const threshold = 100;

    const [[total]] = await pool.query(`SELECT COUNT(*) AS totalItems FROM inventory`);
    const [[available]] = await pool.query(
      `SELECT COUNT(*) AS availableCount FROM inventory WHERE COALESCE(quantity,0) > 0`
    );
    const [[low]] = await pool.query(
      `SELECT COUNT(*) AS lowStockCount
       FROM inventory
       WHERE COALESCE(quantity,0) > 0 AND COALESCE(quantity,0) <= ?`,
      [threshold]
    );
    const [[out]] = await pool.query(
      `SELECT COUNT(*) AS outOfStockCount FROM inventory WHERE COALESCE(quantity,0) = 0`
    );

    res.json({
      totalItems: total.totalItems || 0,
      availableCount: available.availableCount || 0,
      lowStockCount: low.lowStockCount || 0,
      outOfStockCount: out.outOfStockCount || 0,
      threshold,
    });
  } catch (e) {
    console.error("inventory/summary error:", e);
    res.status(500).json({ message: "Failed to load inventory summary" });
  }
});

// ✅ used by dashboard low stock table
router.get("/low-stock", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const threshold = 100;

    const [rows] = await pool.query(
      `
      SELECT
        i.inv_id,
        i.item_name AS name,
        COALESCE(i.quantity,0) AS quantity,
        COALESCE(c.category_name,'') AS category_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      WHERE COALESCE(i.quantity,0) > 0 AND COALESCE(i.quantity,0) <= ?
      ORDER BY COALESCE(i.quantity,0) ASC
      LIMIT ?
      `,
      [threshold, limit]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("inventory/low-stock error:", e);
    res.status(500).json({ message: "Failed to load low stock items" });
  }
});

module.exports = router;