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

const router = express.Router();

// Produktverwaltung
router.get("/products", getProducts);
router.get("/products/:id", getProduct);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Warenkorb & Kauf
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.delete("/cart/:id", removeCartItem);
router.post("/checkout", checkout);

// Kaufhistorie
router.get("/orders", getOrders);

module.exports = router;
