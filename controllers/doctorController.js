// server/controllers/doctorController.js
const Appointment = require("../models/Appointment");
const Availability = require("../models/Availability");
const Doctor = require("../models/Doctor");
const User = require("../models/User");

// @desc    Get all doctors with filters
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res) => {
  try {
    const { specialty, name, city, state } = req.query;
    const query = {};

    // Build query based on filters
    if (specialty) {
      query.specialty = specialty;
    }

    if (city) {
      query["location.city"] = { $regex: city, $options: "i" };
    }

    if (state) {
      query["location.state"] = { $regex: state, $options: "i" };
    }

    // Search by doctor's name (requires joining with User collection)
    let doctors;
    if (name) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: name, $options: "i" } },
          { lastName: { $regex: name, $options: "i" } },
        ],
        role: "doctor",
      });

      const doctorUserIds = users.map((user) => user._id);

      doctors = await Doctor.find({
        ...query,
        user: { $in: doctorUserIds },
      }).populate("user", "firstName lastName email");
    } else {
      doctors = await Doctor.find(query).populate(
        "user",
        "firstName lastName email"
      );
    }

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Get doctors error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      "user",
      "firstName lastName email"
    );

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Get doctor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/get-appointment
// @access  for doctors
exports.getAppointment = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const doctor = await Doctor.findOne({ user: req.user._id });

    console.log(doctorId);
    console.log(doctor);

    // Get the current date to filter for upcoming appointments
    const currentDate = new Date();

    // Query for appointments where the doctor's ID matches, and the appointment date is in the future
    const upcomingAppointments = await Appointment.find({
      doctor: doctor._id,
      date: { $gte: currentDate }, // Ensures future appointments only
      status: { $ne: "cancelled" }, // Optional: exclude cancelled appointments
    })
      .sort({ date: 1, startTime: 1 }) // Sorting by date and start time
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      })
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      });
    res.status(200).json({
      success: true,
      upcomingAppointments: upcomingAppointments,
    });
  } catch (error) {
    console.error("Get doctor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get single doctor
// @route   GET /api/doctors/get-appointment
// @access  for doctors
exports.getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const doctor = await Doctor.findOne({ user: req.user._id });

    console.log(doctorId);
    console.log(doctor);

    // Get the current date to filter for upcoming appointments
    const currentDate = new Date();

    // Query for appointments where the doctor's ID matches, and the appointment date is in the future
    const upcomingAllAppointments = await Availability.find({
      doctor: doctor._id,
      date: { $gte: currentDate }, // Ensures future appointments only
    }).sort({ date: 1 }); // Sorting by date and start time

    res.status(200).json({
      success: true,
      upcomingAllAppointments: {
        upcomingAllAppointments,
        consultationLocations: doctor.consultationLocations,
      },
    });
  } catch (error) {
    console.error("Get doctor error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.addConsultationLocation = async (req, res) => {
  try {
    const userId = req.user._id;

    const { name, address, city, state } = req.body;

    // Find the doctor by ID
    const doctor = await Doctor.findOne({ user: userId });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Add the new consultation location to the doctor’s consultationLocations array
    doctor.consultationLocations.push({
      name,
      address,
      city,
      state,
    });

    // Save the updated doctor document
    await doctor.save();

    res
      .status(200)
      .json({ message: "Consultation location added successfully", doctor });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error adding consultation location", error });
  }
};
