const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// SIGNUP  POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { username, password, confirmPassword, role_id, gender_id, shift_start, shift_end } = req.body;

  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  if (!role_id || !gender_id || !shift_start || !shift_end) {
    return res.status(400).json({ message: "Role, gender, and shift are required" });
  }

  try {
    const [exists] = await pool.query("SELECT user_id FROM users WHERE username=?", [username]);
    if (exists.length) return res.status(409).json({ message: "Username already exists" });

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role_id, shift_start, shift_end, gender_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, password_hash, Number(role_id), shift_start, shift_end, Number(gender_id)]
    );

    res.status(201).json({ ok: true, message: "User created" });
  } catch (e) {
    console.error("signup error:", e);
    res.status(500).json({ message: "Signup failed", error: e.code || e.message });
  }
});

// LOGIN  POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Username and password are required" });

  try {
    const [rows] = await pool.query(
      "SELECT user_id, username, password_hash, role_id, gender_id, shift_start, shift_end FROM users WHERE username=?",
      [username]
    );

    if (!rows.length) return res.status(401).json({ message: "Invalid username or password" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid username or password" });

    const secret = process.env.JWT_SECRET || "dev_secret";

    const token = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id, username: user.username },
      secret,
      { expiresIn: "1d" }
    );

    res.json({
      ok: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
        gender_id: user.gender_id,
        shift_start: user.shift_start,
        shift_end: user.shift_end,
      },
    });
  } catch (e) {
    console.error("login error:", e);
    res.status(500).json({ message: "Login failed", error: e.code || e.message });
  }
});

module.exports = router;