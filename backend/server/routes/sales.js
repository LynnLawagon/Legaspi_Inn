const express = require("express");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/sales/summary
 */
router.get("/summary", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COALESCE(SUM(sd.quantity * sd.unit_price_sold), 0) AS todayTotal,
        COALESCE(COUNT(DISTINCT s.sales_id), 0) AS todayCount
      FROM sales s
      LEFT JOIN sales_details sd ON sd.sales_id = s.sales_id
      WHERE DATE(s.sale_date) = CURDATE()
    `);

    res.json({
      todayTotal: Number(rows?.[0]?.todayTotal || 0),
      todayCount: Number(rows?.[0]?.todayCount || 0),
    });
  } catch (err) {
    console.error("GET /api/sales/summary error:", err);
    res.status(500).json({
      message: "Failed to load sales summary",
      error: err.code || err.message,
    });
  }
});

/**
 * GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=50
 */
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = Number(req.query.limit || 0);

    const where = [];
    const params = [];

    if (from) {
      where.push("DATE(s.sale_date) >= ?");
      params.push(from);
    }
    if (to) {
      where.push("DATE(s.sale_date) <= ?");
      params.push(to);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSQL = limit > 0 ? `LIMIT ${Math.min(limit, 500)}` : "";

    const [rows] = await pool.query(
      `
      SELECT
        s.sales_id,
        s.trans_id,
        s.user_id,
        s.sale_date,
        g.guest_name AS guest_name,
        r.room_number,
        u.username,
        COALESCE(SUM(sd.quantity), 0) AS items_count,
        COALESCE(SUM(sd.quantity * sd.unit_price_sold), 0) AS total_amount
      FROM sales s
      LEFT JOIN transactions t ON t.trans_id = s.trans_id
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      LEFT JOIN users u ON u.user_id = s.user_id
      LEFT JOIN sales_details sd ON sd.sales_id = s.sales_id
      ${whereSQL}
      GROUP BY
        s.sales_id, s.trans_id, s.user_id, s.sale_date,
        g.guest_name, r.room_number, u.username
      ORDER BY s.sale_date DESC, s.sales_id DESC
      ${limitSQL}
      `,
      params
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("GET /api/sales error:", err);
    res.status(500).json({
      message: "Failed to load sales",
      error: err.code || err.message,
    });
  }
});

/**
 * GET /api/sales/:sales_id/details
 */
router.get("/:sales_id/details", async (req, res) => {
  try {
    const { sales_id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        sd.sd_id,
        sd.sales_id,
        sd.inv_id,
        sd.quantity,
        sd.unit_price_sold,
        i.item_name AS item_name
      FROM sales_details sd
      LEFT JOIN inventory i ON i.inv_id = sd.inv_id
      WHERE sd.sales_id = ?
      ORDER BY sd.sd_id ASC
      `,
      [Number(sales_id)]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("GET /api/sales/:id/details error:", err);
    res.status(500).json({
      message: "Failed to load sales details",
      error: err.code || err.message,
    });
  }
});

module.exports = router;