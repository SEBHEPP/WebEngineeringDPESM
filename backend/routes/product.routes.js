// Felix
const express = require("express");

const productController = require("../controllers/product.controller");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

router.get("/", productController.listProducts);
router.get("/search", productController.listProducts);
router.get("/:id", productController.getProductById);

router.post(
  "/",
  checkAuto({
    resourceType: "product",
    action: "create"
  }),
  productController.createProduct
);

router.patch(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "update"
  }),
  productController.updateProduct
);

router.put(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "update"
  }),
  productController.updateProduct
);

router.delete(
  "/:id",
  checkAuto({
    resourceType: "product",
    action: "delete"
  }),
  productController.deleteProduct
);

module.exports = router;
