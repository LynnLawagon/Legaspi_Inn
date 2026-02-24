const express = require("express");
const pool = require("../db");
const router = express.Router();

// get purchased items by transaction
router.get("/by-transaction/:trans_id", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        pd.pd_id,
        p.purchased_id,
        p.trans_id,
        pd.inv_id,
        i.item_name,
        pd.quantity,
        pd.unit_cost,
        (pd.quantity * pd.unit_cost) AS line_total,
        p.date_recorded
      FROM purchased p
      JOIN purchased_details pd ON pd.purchased_id = p.purchased_id
      JOIN inventory i ON i.inv_id = pd.inv_id
      WHERE p.trans_id = ?
      ORDER BY pd.pd_id DESC
    `, [Number(req.params.trans_id)]);

    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load purchased items" });
  }
});

// add purchased item (used by your SalesModal Save)
router.post("/", async (req, res) => {
  const { trans_id, user_id, inv_id, quantity, unit_cost } = req.body;

  if (!trans_id || !user_id || !inv_id || !quantity || unit_cost == null) {
    return res.status(400).json({ message: "trans_id, user_id, inv_id, quantity, unit_cost required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ensure purchased header exists for trans_id
    const [pRows] = await conn.query(
      `SELECT purchased_id FROM purchased WHERE trans_id=? LIMIT 1`,
      [Number(trans_id)]
    );

    let purchased_id = pRows[0]?.purchased_id;

    if (!purchased_id) {
      const [ins] = await conn.query(
        `INSERT INTO purchased (user_id, trans_id, date_recorded)
         VALUES (?, ?, NOW())`,
        [Number(user_id), Number(trans_id)]
      );
      purchased_id = ins.insertId;
    }

    // 2) check inventory stock
    const [[inv]] = await conn.query(
      `SELECT quantity FROM inventory WHERE inv_id=? FOR UPDATE`,
      [Number(inv_id)]
    );

    if (!inv) {
      await conn.rollback();
      return res.status(404).json({ message: "Inventory item not found" });
    }

    if (Number(inv.quantity) < Number(quantity)) {
      await conn.rollback();
      return res.status(409).json({ message: "Not enough stock" });
    }

    // 3) insert detail
    const [detail] = await conn.query(
      `INSERT INTO purchased_details (purchased_id, inv_id, quantity, unit_cost)
       VALUES (?, ?, ?, ?)`,
      [Number(purchased_id), Number(inv_id), Number(quantity), Number(unit_cost)]
    );

    // 4) deduct inventory
    await conn.query(
      `UPDATE inventory SET quantity = quantity - ? WHERE inv_id=?`,
      [Number(quantity), Number(inv_id)]
    );

    await conn.commit();
    res.status(201).json({ pd_id: detail.insertId, purchased_id });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: "Failed to save purchased item" });
  } finally {
    conn.release();
  }
});

// delete purchased detail (and restore stock)
router.delete("/detail/:pd_id", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT pd_id, inv_id, quantity FROM purchased_details WHERE pd_id=?`,
      [Number(req.params.pd_id)]
    );
    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "Purchased detail not found" });
    }

    await conn.query(`DELETE FROM purchased_details WHERE pd_id=?`, [Number(row.pd_id)]);
    await conn.query(`UPDATE inventory SET quantity = quantity + ? WHERE inv_id=?`, [Number(row.quantity), Number(row.inv_id)]);

    await conn.commit();
    res.json({ deleted: 1 });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: "Failed to delete purchased detail" });
  } finally {
    conn.release();
  }
});

module.exports = router;