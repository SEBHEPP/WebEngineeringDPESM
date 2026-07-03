const express = require("express");

const { optionalAuth } = require("../controllers/auth.controller");
const autoRoutes = require("./auto.routes");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use(optionalAuth);
router.use("/auto", autoRoutes);
router.use("/health", healthRoutes);
router.use("/users", userRoutes);

module.exports = router;
