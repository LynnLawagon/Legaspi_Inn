const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, role_id, shift_start, shift_end
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
  const { username, password, role_id, shift_start, shift_end } = req.body;

  try {
    const id = Number(req.params.id);

    const fields = [];
    const params = [];

    if (username !== undefined) {
      fields.push("username=?");
      params.push(String(username).trim());
    }
    if (role_id !== undefined) {
      fields.push("role_id=?");
      params.push(role_id ?? null);
    }
    if (shift_start !== undefined) {
      fields.push("shift_start=?");
      params.push(shift_start ?? null);
    }
    if (shift_end !== undefined) {
      fields.push("shift_end=?");
      params.push(shift_end ?? null);
    }

    if (password && String(password).trim()) {
      const hash = await bcrypt.hash(String(password), 10);
      fields.push("password_hash=?");
      params.push(hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);

    const [r] = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE user_id=?`,
      params
    );

    if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ updated: r.affectedRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;