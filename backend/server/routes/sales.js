const express = require("express");
const pool = require("../db");

const router = express.Router();

//POST
router.post("/", async (req, res) => {
  const { trans_id, user_id, items } = req.body;

  if (!trans_id || !user_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "trans_id, user_id, and items are required",
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [sale] = await conn.query(
      `INSERT INTO sales (trans_id, user_id, sale_date)
       VALUES (?, ?, NOW())`,
      [Number(trans_id), Number(user_id)]
    );

    const salesId = sale.insertId;

    for (const item of items) {
      const invId = Number(item.inv_id);
      const qty = Number(item.quantity);

      if (!invId || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Each sale item must have a valid inv_id and quantity > 0");
      }

      const [[inv]] = await conn.query(
        `SELECT inv_id, quantity, item_value
         FROM inventory
         WHERE inv_id = ?
         FOR UPDATE`,
        [invId]
      );

      if (!inv) throw new Error("Inventory item not found");
      if (Number(inv.quantity || 0) < qty) {
        throw new Error(`Not enough stock for inventory item ${invId}`);
      }

      await conn.query(
        `INSERT INTO sales_details
         (sales_id, inv_id, quantity, unit_price_sold)
         VALUES (?, ?, ?, ?)`,
        [salesId, invId, qty, Number(inv.item_value || 0)]
      );

      await conn.query(
        `UPDATE inventory
         SET quantity = quantity - ?
         WHERE inv_id = ?`,
        [qty, invId]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, sales_id: salesId });
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/sales error:", err);
    res.status(400).json({ message: err.message || "Failed to save sale" });
  } finally {
    conn.release();
  }
});

//GET
router.get("/summary", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COALESCE(SUM(x.total_amount), 0) AS todayTotal,
        COUNT(*) AS todayCount
      FROM (
        SELECT
          t.trans_id,
          (
            COALESCE(t.actual_rate_charged, 0)
            + COALESCE(gd.total_guest_damage, 0)
            + COALESCE(ss.total_sales, 0)
          ) AS total_amount
        FROM transactions t
        LEFT JOIN (
          SELECT trans_id, SUM(charge_amount) AS total_guest_damage
          FROM guest_damage
          GROUP BY trans_id
        ) gd ON gd.trans_id = t.trans_id
        LEFT JOIN (
          SELECT s.trans_id, SUM(sd.quantity * sd.unit_price_sold) AS total_sales
          FROM sales s
          JOIN sales_details sd ON sd.sales_id = s.sales_id
          GROUP BY s.trans_id
        ) ss ON ss.trans_id = t.trans_id
        WHERE DATE(t.date_created) = CURDATE()
      ) x
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

//GET
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = Number(req.query.limit || 0);

    const where = [];
    const params = [];

    if (from) {
      where.push("DATE(COALESCE(sc.last_sale_date, t.date_created)) >= ?");
      params.push(from);
    }
    if (to) {
      where.push("DATE(COALESCE(sc.last_sale_date, t.date_created)) <= ?");
      params.push(to);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSQL = limit > 0 ? `LIMIT ${Math.min(limit, 500)}` : "";

    const [rows] = await pool.query(
      `
      SELECT
        t.trans_id,
        t.user_id,
        COALESCE(sc.last_sale_date, t.date_created) AS sale_date,
        g.guest_name,
        r.room_number,
        u.username,
        COALESCE(sc.items_count, 0) AS items_count,
        COALESCE(t.actual_rate_charged, 0) AS room_amount,
        COALESCE(gd.total_guest_damage, 0) AS damage_amount,
        COALESCE(sc.total_sales, 0) AS purchased_amount,
        (
          COALESCE(t.actual_rate_charged, 0)
          + COALESCE(gd.total_guest_damage, 0)
          + COALESCE(sc.total_sales, 0)
        ) AS total_amount
      FROM transactions t
      LEFT JOIN guests g ON g.guest_id = t.guest_id
      LEFT JOIN rooms r ON r.room_id = t.room_id
      LEFT JOIN users u ON u.user_id = t.user_id
      LEFT JOIN (
        SELECT
          s.trans_id,
          COALESCE(SUM(sd.quantity), 0) AS items_count,
          COALESCE(SUM(sd.quantity * sd.unit_price_sold), 0) AS total_sales,
          MAX(s.sale_date) AS last_sale_date
        FROM sales s
        JOIN sales_details sd ON sd.sales_id = s.sales_id
        GROUP BY s.trans_id
      ) sc ON sc.trans_id = t.trans_id
      LEFT JOIN (
        SELECT
          trans_id,
          COALESCE(SUM(charge_amount), 0) AS total_guest_damage
        FROM guest_damage
        GROUP BY trans_id
      ) gd ON gd.trans_id = t.trans_id
      ${whereSQL}
      ORDER BY t.date_created DESC, t.trans_id DESC
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

//GET
router.get("/transaction/:transId/details", async (req, res) => {
  try {
    const transId = Number(req.params.transId);

    const [rows] = await pool.query(
      `
      SELECT
        sd.sd_id,
        s.trans_id,
        s.sales_id,
        sd.inv_id,
        sd.quantity,
        sd.unit_price_sold,
        i.item_name
      FROM sales s
      JOIN sales_details sd ON sd.sales_id = s.sales_id
      LEFT JOIN inventory i ON i.inv_id = sd.inv_id
      WHERE s.trans_id = ?
      ORDER BY sd.sd_id ASC
      `,
      [transId]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("GET /api/sales/transaction/:transId/details error:", err);
    res.status(500).json({
      message: "Failed to load transaction sales details",
      error: err.code || err.message,
    });
  }
});

module.exports = router;