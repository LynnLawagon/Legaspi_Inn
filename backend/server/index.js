require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const roomRoutes = require("./routes/rooms");
const guestRoutes = require("./routes/guests");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const damageRoutes = require("./routes/damages");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/damages", damageRoutes); // ✅ only once

// ✅ DB health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, db: "failed", error: e.code || e.message });
  }
});

const PORT = Number(process.env.PORT || 5000);

// ✅ handles EADDRINUSE nicely
const server = app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Close the other server or change PORT.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});