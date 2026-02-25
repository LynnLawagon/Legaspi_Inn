const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const router = express.Router();

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

  // Validate
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
    // username unique
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
    console.error(e);
    // FK errors will show here if ids are wrong
    res.status(500).json({ message: "Signup failed", error: e.code });
  }
});

module.exports = router;