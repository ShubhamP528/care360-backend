// server/routes/authRoutes.js
const express = require("express");
const {
  register,
  login,
  verifyToken,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/verify", protect, verifyToken);

module.exports = router;
