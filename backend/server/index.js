require("dotenv").config();
const express = require("express");
const cors = require("cors");

const roomsRoutes = require("./routes/rooms");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/rooms", roomsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
