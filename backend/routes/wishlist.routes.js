// Dennis
const express = require("express");

const wishlistController = require("../controllers/wishlist.controller");
const { authenticate } = require("../controllers/auth.controller");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

router.get("/", authenticate, wishlistController.listWishlists);

router.post(
  "/",
  checkAuto({
    resourceType: "wishlist",
    action: "create"
  }),
  wishlistController.createWishlist
);

router.get(
  "/:id",
  checkAuto({
    resourceType: "wishlist",
    action: "read"
  }),
  wishlistController.getWishlistById
);

router.post(
  "/:id/items",
  checkAuto({
    resourceType: "wishlist",
    action: "add_item"
  }),
  wishlistController.addProduct
);

router.post(
  "/:id/products",
  checkAuto({
    resourceType: "wishlist",
    action: "add_item"
  }),
  wishlistController.addProduct
);

router.delete(
  "/:id/items/:productId",
  checkAuto({
    resourceType: "wishlist",
    action: "remove_item"
  }),
  wishlistController.removeProduct
);

router.delete(
  "/:id/products/:productId",
  checkAuto({
    resourceType: "wishlist",
    action: "remove_item"
  }),
  wishlistController.removeProduct
);

router.post(
  "/:id/permissions",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.setPermission
);

router.put(
  "/:id/permissions/:userId",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.setPermission
);

router.delete(
  "/:id/permissions/:userId",
  checkAuto({
    resourceType: "wishlist",
    action: "manage_permissions"
  }),
  wishlistController.removePermission
);

router.delete(
  "/:id",
  checkAuto({
    resourceType: "wishlist",
    action: "delete"
  }),
  wishlistController.deleteWishlist
);

module.exports = router;
