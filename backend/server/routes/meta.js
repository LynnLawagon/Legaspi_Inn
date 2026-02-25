const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/genders", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT gender_id, gender_name FROM gender ORDER BY gender_id"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load genders" });
  }
});

router.get("/roles", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT role_id, role_name FROM roles ORDER BY role_id"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load roles" });
  }
});

module.exports = router;