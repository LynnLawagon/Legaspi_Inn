const express = require("express");
const pool = require("../db");
const router = express.Router();

//GET
router.get("/by-transaction/:transId", async (req, res) => {
  try {
    const transId = Number(req.params.transId);

    const [rows] = await pool.query(
      `
      SELECT
        pd.pd_id,
        pd.inv_id,
        i.item_name AS item_name,
        pd.quantity,
        pd.unit_cost
      FROM purchased p
      JOIN purchased_details pd ON pd.purchased_id = p.purchased_id
      JOIN inventory i ON i.inv_id = pd.inv_id
      WHERE p.trans_id = ?
      ORDER BY pd.pd_id ASC
      `,
      [transId]
    );

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("purchased by transaction error:", e);
    res.status(500).json({ message: "Failed to load purchased items", error: e.code || e.message });
  }
});

//POST
router.post("/", async (req, res) => {
  const { trans_id, user_id, inv_id, quantity, unit_cost } = req.body;

  if (!trans_id || !user_id || !inv_id || !quantity) {
    return res.status(400).json({ message: "trans_id, user_id, inv_id, quantity are required" });
  }

  const transId = Number(trans_id);
  const userId = Number(user_id);
  const invId = Number(inv_id);
  const qty = Number(quantity);
  const unitCost = Number(unit_cost ?? 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ message: "quantity must be > 0" });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      `SELECT purchased_id FROM purchased WHERE trans_id = ? LIMIT 1`,
      [transId]
    );

    let purchasedId = existing?.purchased_id;

    if (!purchasedId) {
      const [ins] = await conn.query(
        `INSERT INTO purchased (user_id, trans_id, date_recorded)
         VALUES (?, ?, NOW())`,
        [userId, transId]
      );
      purchasedId = ins.insertId;
    }

    const [[inv]] = await conn.query(
      `SELECT inv_id, quantity FROM inventory WHERE inv_id = ? FOR UPDATE`,
      [invId]
    );

    if (!inv) throw new Error("Inventory item not found");
    if (Number(inv.quantity || 0) < qty) throw new Error("Not enough stock");

    await conn.query(
      `INSERT INTO purchased_details (purchased_id, inv_id, quantity, unit_cost)
       VALUES (?, ?, ?, ?)`,
      [purchasedId, invId, qty, unitCost]
    );

    await conn.query(
      `UPDATE inventory SET quantity = quantity - ? WHERE inv_id = ?`,
      [qty, invId]
    );

    await conn.commit();
    res.status(201).json({ ok: true, purchased_id: purchasedId });
  } catch (e) {
    await conn.rollback();
    console.error("purchased add error:", e);
    res.status(400).json({ message: e.message || "Failed to add purchased item" });
  } finally {
    conn.release();
  }
});

module.exports = router;