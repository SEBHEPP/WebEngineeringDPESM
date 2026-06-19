const express = require("express");

const { checkAuthorization } = require("../controllers/auto.controller");

const router = express.Router();

router.post("/check", checkAuthorization);

module.exports = router;
