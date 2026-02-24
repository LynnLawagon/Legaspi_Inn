const express = require("express");
const pool = require("../db");
const router = express.Router();

// summary used by dashboard
router.get("/summary", async (req, res) => {
  try {
    const threshold = 30; // you can change
    const [[total]] = await pool.query(`SELECT COUNT(*) AS totalItems FROM inventory`);
    const [[available]] = await pool.query(`SELECT COUNT(*) AS availableCount FROM inventory WHERE quantity > 0`);
    const [[low]] = await pool.query(`SELECT COUNT(*) AS lowStockCount FROM inventory WHERE quantity > 0 AND quantity <= ?`, [threshold]);
    const [[out]] = await pool.query(`SELECT COUNT(*) AS outOfStockCount FROM inventory WHERE quantity = 0`);

    res.json({
      totalItems: total.totalItems || 0,
      availableCount: available.availableCount || 0,
      lowStockCount: low.lowStockCount || 0,
      outOfStockCount: out.outOfStockCount || 0,
      threshold,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load inventory summary" });
  }
});

// low stock table
router.get("/low-stock", async (req, res) => {
  const limit = Number(req.query.limit || 10);
  try {
    const [rows] = await pool.query(`
      SELECT i.inv_id, i.item_name AS name, i.quantity,
             c.category_name
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      WHERE i.quantity > 0
      ORDER BY i.quantity ASC
      LIMIT ?
    `, [limit]);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load low stock items" });
  }
});

// items list for purchased modal dropdown
router.get("/items", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT inv_id, item_name, quantity
      FROM inventory
      WHERE quantity > 0
      ORDER BY item_name ASC
    `);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load inventory items" });
  }
});

module.exports = router;