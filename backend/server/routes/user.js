const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// GET 
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.role_id, u.shift_start, u.shift_end, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id=? LIMIT 1`,
      [Number(req.params.id)]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load user" });
  }
});

// PUT 
router.put("/:id", authRequired, async (req, res) => {
  const { username, password, role_id, shift_start, shift_end } = req.body;

  try {
    const id = Number(req.params.id);

    if (username !== undefined) {
      const [dup] = await pool.query(
        "SELECT user_id FROM users WHERE username=? AND user_id <> ? LIMIT 1",
        [String(username).trim(), id]
      );

      if (dup.length) {
        return res.status(409).json({ message: "Username already exists" });
      }
    }

    const fields = [];
    const params = [];

    if (username !== undefined) {
      fields.push("username=?");
      params.push(String(username).trim());
    }
    if (role_id !== undefined) {
      fields.push("role_id=?");
      params.push(Number(role_id));
    }
    if (shift_start !== undefined) {
      fields.push("shift_start=?");
      params.push(shift_start);
    }
    if (shift_end !== undefined) {
      fields.push("shift_end=?");
      params.push(shift_end);
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

    if (r.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.role_id, u.shift_start, u.shift_end, r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id=? LIMIT 1`,
      [id]
    );

    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update user" });
  }
});

module.exports = router;