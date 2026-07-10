const express = require("express");

const adminController = require("../controllers/admin.controller");
const checkAuto = require("../middlewares/checkAuto");

const router = express.Router();

router.get(
  "/stats",
  checkAuto({
    resourceType: "user",
    action: "manage_users"
  }),
  adminController.getStats
);

module.exports = router;
