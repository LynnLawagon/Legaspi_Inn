// index.js (server.js)
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth"); // ✅ add this
const dashboardRoutes = require("./routes/dashboard");
const roomRoutes = require("./routes/rooms");
const guestRoutes = require("./routes/guests");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const damageRoutes = require("./routes/damages");

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// ✅ mount auth
app.use("/api/auth", authRoutes);

// other api routes
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/damages", damageRoutes); // ✅ use the variable, not require() again

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));