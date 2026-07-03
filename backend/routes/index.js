const express = require("express");

const { optionalAuth } = require("../controllers/auth.controller");
const autoRoutes = require("./auto.routes");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const orderRoutes = require("./order.routes");
const productRoutes = require("./product.routes");
const userRoutes = require("./user.routes");
const wishlistRoutes = require("./wishlist.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use(optionalAuth);
router.use("/auto", autoRoutes);
router.use("/health", healthRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/users", userRoutes);
router.use("/wishlists", wishlistRoutes);

module.exports = router;
