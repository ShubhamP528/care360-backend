// server/routes/appointmentRoutes.js
const express = require("express");
const {
  bookAppointment,
  // getDoctorAppointments,
  cancelAppointment,
  // getAppointmentDetails,
} = require("../controllers/appointmentController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("patient"), bookAppointment);
// router.get("/doctor", protect, authorize("doctor"), getDoctorAppointments);
router.put("/:id/cancel", protect, cancelAppointment);
// router.get("/:id", protect, getAppointmentDetails);

module.exports = router;
