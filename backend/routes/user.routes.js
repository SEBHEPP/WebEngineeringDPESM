// Paul
const express = require("express");

const userController = require("../controllers/user.controller");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

router.get(
  "/",
  checkAuto({
    resourceType: "user",
    resourceId: (req) => req.query.userId || req.query.id,
    action: "manage_users"
  }),
  userController.findUser
);

router.get(
  "/search",
  checkAuto({
    resourceType: "user",
    resourceId: (req) => req.query.userId || req.query.id,
    action: "manage_users"
  }),
  userController.findUser
);

router.post(
  "/admins",
  checkAuto({
    resourceType: "user",
    action: "create_admin"
  }),
  userController.createAdmin
);

router.get(
  "/:id",
  checkAuto({
    resourceType: "user",
    action: "manage_users"
  }),
  userController.getUserById
);

router.delete(
  "/:id",
  checkAuto({
    resourceType: "user",
    action: "delete"
  }),
  userController.deleteUser
);

router.patch(
  "/:id/block",
  checkAuto({
    resourceType: "user",
    action: "block"
  }),
  userController.blockUser
);

router.patch(
  "/:id/unblock",
  checkAuto({
    resourceType: "user",
    action: "unblock"
  }),
  userController.unblockUser
);

module.exports = router;
