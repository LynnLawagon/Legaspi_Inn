const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, full_name, role_id, shift_start, shift_end
       FROM users WHERE user_id=? LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load user" });
  }
});

router.put("/:id", async (req, res) => {
  const { full_name, password, role_id, shift_start, shift_end } = req.body;

  try {
    let passSql = "";
    let params = [full_name ?? null, role_id ?? null, shift_start ?? null, shift_end ?? null, Number(req.params.id)];

    if (password && String(password).trim()) {
      const hash = await bcrypt.hash(password, 10);
      passSql = ", password=?";
      params = [full_name ?? null, role_id ?? null, shift_start ?? null, shift_end ?? null, hash, Number(req.params.id)];
    }

    const sql = `
      UPDATE users
      SET full_name=?, role_id=?, shift_start=?, shift_end=? ${passSql}
      WHERE user_id=?
    `;

    const [r] = await pool.query(sql, params);
    if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;