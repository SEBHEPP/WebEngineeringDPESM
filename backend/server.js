require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Statisches Frontend ausliefern
app.use(express.static(path.join(__dirname, "../frontend")));

// Healthcheck inklusive Datenbankprüfung
app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS now");

    res.status(200).json({
      status: "ok",
      service: "backend",
      database: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      service: "backend",
      database: "not_connected",
      message: error.message
    });
  }
});

// API-Fallback
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route not found",
    path: req.originalUrl
  });
});

// Frontend-Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
