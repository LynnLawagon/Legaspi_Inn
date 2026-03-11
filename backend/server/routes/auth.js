const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// SIGNUP  POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const {
    username,
    password,
    confirmPassword,
    role_id,
    gender_id,
    shift_start,
    shift_end,
  } = req.body;

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
    const [exists] = await pool.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username.trim()]
    );

    if (exists.length) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role_id, gender_id, shift_start, shift_end)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username.trim(), password_hash, Number(role_id), Number(gender_id), shift_start, shift_end]
    );

    return res.status(201).json({ message: "Signup success" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server error",
      code: err.code,
      sqlMessage: err.sqlMessage,
      error: err.message,
    });
  }
});

// LOGIN  POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, password_hash, role_id, gender_id, shift_start, shift_end
       FROM users
       WHERE username = ?`,
      [username.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "14d" }
    );

    delete user.password_hash;
    return res.json({ token, user });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server error",
      code: err.code,
      sqlMessage: err.sqlMessage,
      error: err.message,
    });
  }
});

module.exports = router;