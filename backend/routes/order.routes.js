// Felix
const express = require("express");

const orderController = require("../controllers/order.controller");
const { authenticate } = require("../controllers/auth.controller");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

router.post("/", authenticate, orderController.createOrder);
router.post("/checkout", authenticate, orderController.createOrder);

router.get("/", authenticate, orderController.listOrders);

router.get(
  "/:id",
  checkAuto({
    resourceType: "order",
    action: "read"
  }),
  orderController.getOrderById
);

module.exports = router;
