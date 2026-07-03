const express = require("express");

const autoRoutes = require("./auto.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use("/auto", autoRoutes);
router.use("/health", healthRoutes);

module.exports = router;
