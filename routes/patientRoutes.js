// server/routes/patientRoutes.js
const express = require("express");
const {
  getPatientProfile,
  updatePatientProfile,
  getPatientAppointments,
} = require("../controllers/patientController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/profile", protect, authorize("patient"), getPatientProfile);
router.put("/profile", protect, authorize("patient"), updatePatientProfile);
router.get(
  "/appointments",
  protect,
  authorize("patient"),
  getPatientAppointments
);

module.exports = router;
