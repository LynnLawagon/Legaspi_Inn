require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const { authRequired } = require("./middleware/auth");

const dashboardRoutes = require("./routes/dashboard");
const roomRoutes = require("./routes/rooms");
const guestRoutes = require("./routes/guests");
const inventoryRoutes = require("./routes/inventory");
const transactionRoutes = require("./routes/transactions");
const damageRoutes = require("./routes/damages");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));

app.use(express.json());

// test health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// auth
app.use("/api/auth", authRoutes);

// protected user route
app.use("/api/users", authRequired, userRoutes);

// other api routes
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/guests", guestRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/damages", damageRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));