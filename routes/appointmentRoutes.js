// server/routes/appointmentRoutes.js
const express = require("express");
const {
  bookAppointment,
  cancelAppointment,
} = require("../controllers/appointmentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("patient"), bookAppointment);
router.put("/:id/cancel", protect, cancelAppointment);

module.exports = router;
