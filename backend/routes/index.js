const express = require("express");

const { optionalAuth } = require("../controllers/auth.controller");
const autoRoutes = require("./auto.routes");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use(optionalAuth);
router.use("/auto", autoRoutes);
router.use("/health", healthRoutes);

module.exports = router;
