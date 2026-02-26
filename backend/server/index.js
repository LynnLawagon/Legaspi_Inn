require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { authRequired } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const metaRoutes = require("./routes/meta");

const dashboardRoutes = require("./routes/dashboard");
const roomRoutes = require("./routes/rooms");
const guestRoutes = require("./routes/guests");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const damageRoutes = require("./routes/damages");
const purchasedRoutes = require("./routes/purchased");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));

app.use(express.json());

// health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// PUBLIC
app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);

// PROTECTED
app.use("/api/users", authRequired, userRoutes);
app.use("/api/dashboard", authRequired, dashboardRoutes);
app.use("/api/rooms", authRequired, roomRoutes);
app.use("/api/guests", authRequired, guestRoutes);
app.use("/api/inventory", authRequired, inventoryRoutes);
app.use("/api/transactions", authRequired, transactionRoutes);
app.use("/api/damages", authRequired, damageRoutes);
app.use("/api/purchased", authRequired, purchasedRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));