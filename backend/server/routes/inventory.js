// routes/inventory.js
const express = require("express");
const pool = require("../db");
const router = express.Router();

/**
 * Compute status name by quantity
 */
function statusNameByQty(qty) {
  const q = Number(qty) || 0;
  if (q === 0) return "Not available";
  if (q < 100) return "Low stock";
  return "Available";
}

/**
 * Get inv_status_id by status_name
 * Make sure inventory_status.status_name contains:
 *  - Available
 *  - Low stock
 *  - Not available
 */
async function getStatusIdByName(status_name) {
  const [[row]] = await pool.query(
    `SELECT inv_status_id FROM inventory_status WHERE LOWER(status_name) = LOWER(?) LIMIT 1`,
    [status_name]
  );
  return row?.inv_status_id ?? null;
}

// Lookups (no statuses needed on frontend anymore, but okay to keep)
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
    console.error(e);
    res.status(500).json({ message: "Failed to load inventory lookups", error: e.code || e.message });
  }
});

// List (WITH TYPE + STATUS)
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        i.inv_id,
        i.item_name,
        i.category_id,
        c.category_name,
        i.inv_type_id,
        t.type_name,
        i.inv_status_id,
        s.status_name,
        COALESCE(i.quantity,0) AS quantity
      FROM inventory i
      LEFT JOIN inventory_category c ON c.category_id = i.category_id
      LEFT JOIN inventory_type t ON t.inv_type_id = i.inv_type_id
      LEFT JOIN inventory_status s ON s.inv_status_id = i.inv_status_id
      ORDER BY i.inv_id DESC
    `);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch inventory", error: e.code || e.message });
  }
});

// Create (STATUS AUTO ✅)
router.post("/", async (req, res) => {
  const { item_name, category_id, inv_type_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const qty = Number(quantity ?? 0);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ message: "quantity must be a number >= 0" });
    }

    const status_name = statusNameByQty(qty);
    const inv_status_id = await getStatusIdByName(status_name);

    const [r] = await pool.query(
      `INSERT INTO inventory (item_name, category_id, inv_type_id, inv_status_id, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(item_name).trim(),
        category_id ?? null,
        inv_type_id ?? null,
        inv_status_id,
        qty,
      ]
    );

    res.status(201).json({ inv_id: r.insertId, status_name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create inventory item", error: e.code || e.message });
  }
});

// Update (STATUS AUTO ✅)
router.put("/:id", async (req, res) => {
  const { item_name, category_id, inv_type_id, quantity } = req.body;
  if (!item_name) return res.status(400).json({ message: "item_name required" });

  try {
    const qty = Number(quantity ?? 0);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ message: "quantity must be a number >= 0" });
    }

    const status_name = statusNameByQty(qty);
    const inv_status_id = await getStatusIdByName(status_name);

    const [r] = await pool.query(
      `UPDATE inventory
       SET item_name=?, category_id=?, inv_type_id=?, inv_status_id=?, quantity=?
       WHERE inv_id=?`,
      [
        String(item_name).trim(),
        category_id ?? null,
        inv_type_id ?? null,
        inv_status_id,
        qty,
        Number(req.params.id),
      ]
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ updated: r.affectedRows, status_name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update inventory item", error: e.code || e.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM inventory WHERE inv_id=?`, [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ deleted: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete inventory item", error: e.code || e.message });
  }
});

module.exports = router;