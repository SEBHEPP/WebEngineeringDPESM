const express = require("express");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCart,
  addToCart,
  removeCartItem,
  checkout,
  getOrders
} = require("../controllers/inv.controller");
const checkAuth = require("../middlewares/checkAuth");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

// Alle Inventar-Routen benötigen Authentifizierung (um req.user zu belegen)
router.use(checkAuth);

// Produktverwaltung
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.post("/products", checkAuto({ resourceType: "product", action: "create" }), createProduct);
router.put("/products/:id", checkAuto({ resourceType: "product", action: "update" }), updateProduct);
router.delete("/products/:id", checkAuto({ resourceType: "product", action: "delete" }), deleteProduct);

// Warenkorb & Kauf
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.delete("/cart/:id", removeCartItem);
router.post("/checkout", checkout);

// Kaufhistorie
router.get("/orders", getOrders);

module.exports = router;
