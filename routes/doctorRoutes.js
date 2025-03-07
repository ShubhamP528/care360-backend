// server/routes/doctorRoutes.js
const express = require("express");
const {
  getDoctors,
  getDoctor,
  getAppointment,
  getDoctorProfile,
  addConsultationLocation,
} = require("../controllers/doctorController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getDoctors);
router.get("/:id", getDoctor);

// Protected routes for doctors
router.get(
  "/getAppointment/upcomming",
  protect,
  authorize("doctor"),
  getAppointment
);

router.post(
  "/addConsultantLocation",
  protect,
  authorize("doctor"),
  addConsultationLocation
);

router.get("/doctor/profile", protect, authorize("doctor"), getDoctorProfile);

module.exports = router;
