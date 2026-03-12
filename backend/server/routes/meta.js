const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET
router.get("/genders", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT gender_id, gender_name FROM gender ORDER BY gender_id ASC"
    );
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("meta/genders error:", e);
    res.status(500).json({
      message: "Failed to load genders",
      error: e.code || e.message,
    });
  }
});

// GET 
router.get("/roles", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT role_id, role_name FROM roles ORDER BY role_id ASC"
    );
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("meta/roles error:", e);
    res.status(500).json({
      message: "Failed to load roles",
      error: e.code || e.message,
    });
  }
});

module.exports = router;