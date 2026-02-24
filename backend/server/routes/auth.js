const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  try {
    const hash = await bcrypt.hash(String(password), 10);

    const [r] = await pool.query(
      `INSERT INTO users (username, password, full_name)
       VALUES (?, ?, ?)`,
      [String(username).trim(), hash, full_name ?? null]
    );

    res.status(201).json({ user_id: r.insertId });
  } catch (err) {
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Username already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Signup failed", error: err.code || err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing credentials" });

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, password, full_name, role_id
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [String(username).trim()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid username/password" });

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ message: "Invalid username/password" });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role_id: user.role_id ?? null },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name ?? "",
        role_id: user.role_id ?? null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.code || err.message });
  }
});

module.exports = router;