// server/routes/availabilityRoutes.js
const express = require("express");
const {
  addAvailability,
  getDoctorAvailability,
  deleteAvailability,
  searchDoctors,
  searchDoctorsByQuery,
} = require("../controllers/availabilityController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, authorize("doctor"), addAvailability);
router.get("/doctor/:doctorId", getDoctorAvailability);
router.get("/search", searchDoctors);
router.post("/search/byQuery", searchDoctorsByQuery);
router.delete("/:id", protect, authorize("doctor"), deleteAvailability);

module.exports = router;
