// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "username and password are required" });

  try {
    const hash = await bcrypt.hash(String(password), 10);

    // ✅ users.password_hash exists
    const [r] = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES (?, ?)`,
      [String(username).trim(), hash]
    );

    res.status(201).json({ user_id: r.insertId });
  } catch (err) {
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing credentials" });

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, password_hash, role_id
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [String(username).trim()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid username/password" });

    const ok = await bcrypt.compare(String(password), user.password_hash || "");
    if (!ok) return res.status(401).json({ message: "Invalid username/password" });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role_id: user.role_id ?? null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id ?? null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;