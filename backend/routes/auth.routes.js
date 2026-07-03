// Paul
const express = require("express");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", authController.register);

router.get("/verify", authController.verifyEmail);
router.post("/verify", authController.verifyEmail);
router.post("/verify/resend", authController.resendVerification);

router.post("/login", authController.login);
router.post("/logout", authController.logout);

router.get("/session", authController.authenticate, authController.getSession);
router.get("/me", authController.authenticate, authController.getSession);

router.post("/magic/request", authController.requestMagicLogin);
router.post("/magic/verify", authController.verifyMagicLogin);
router.post("/magic-login/request", authController.requestMagicLogin);
router.post("/magic-login/verify", authController.verifyMagicLogin);

module.exports = router;
