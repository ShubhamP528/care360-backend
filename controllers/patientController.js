// server/controllers/patientController.js
const Patient = require("../models/Patient");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { path } = require("../app");

// @desc    Get patient profile
// @route   GET /api/patients/profile
// @access  Private (Patient only)
exports.getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id }).populate(
      "user",
      "firstName lastName email"
    );

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Get patient profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patients/profile
// @access  Private (Patient only)
exports.updatePatientProfile = async (req, res) => {
  try {
    const { dateOfBirth, phone, address } = req.body;

    // Find and update patient
    let patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }

    patient = await Patient.findByIdAndUpdate(
      patient._id,
      { dateOfBirth, phone, address },
      { new: true, runValidators: true }
    ).populate("user", "firstName lastName email");

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error("Update patient profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get patient appointments
// @route   GET /api/patients/appointments
// @access  Private (Patient only)
exports.getPatientAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }
    const appointments = await Appointment.find({
      patient: patient._id,
    })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      })
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
