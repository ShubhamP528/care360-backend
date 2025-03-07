// server/controllers/availabilityController.js
const Availability = require("../models/Availability");
const Doctor = require("../models/Doctor");

// @desc    Add availability
// @route   POST /api/availability
// @access  Private (Doctor only)
exports.addAvailability = async (req, res) => {
  try {
    const { consultationLocation, date, timeSlots } = req.body;

    // Find doctor associated with logged-in user
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    console.log(doctor);
    // Check if this location is one of doctor's consultation locations
    const locationExists = doctor.consultationLocations.some(
      (loc) =>
        loc.name === consultationLocation.name &&
        loc.address === consultationLocation.address
    );

    if (!locationExists) {
      return res.status(400).json({
        success: false,
        message: "This consultation location does not exist in your profile",
      });
    }

    // Create availability
    const availability = await Availability.create({
      doctor: doctor._id,
      consultationLocation,
      date,
      timeSlots,
    });

    res.status(201).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Add availability error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Get doctor's availability
// @route   GET /api/availability/search
// @access  Public

exports.searchDoctors = async (req, res) => {
  try {
    const { specialty, city, state, name } = req.query;

    // Build query object based on filters provided
    const query = {};

    if (specialty) {
      query.specialty = { $regex: specialty, $options: "i" }; // Case-insensitive match
    }

    if (city || state) {
      query["location.city"] = city
        ? { $regex: city, $options: "i" }
        : undefined;
      query["location.state"] = state
        ? { $regex: state, $options: "i" }
        : undefined;
    }

    if (name) {
      query["user.firstName"] = { $regex: name, $options: "i" };
    }

    // Search for doctors based on the query
    const doctors = await Doctor.find(query)
      .populate("user", "firstName lastName specialty") // Populating user details
      .exec();

    if (doctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No doctors found matching the criteria.",
      });
    }

    return res.status(200).json({
      success: true,
      data: doctors,
    });
  } catch (error) {
    console.error("Search doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get doctor's availability
// @route   GET /api/availability/search/:query
// @access  Public

// exports.searchDoctorsByQuery = async (req, res) => {
//   try {
//     const { query } = req.body; // This will be the search term (e.g., "Cardiologist")

//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide a search query.",
//       });
//     }

//     // Search for doctors, including user population to access firstName and lastName
//     const doctors = await Doctor.find()
//       .populate("user", "firstName lastName specialty") // Populate the user data
//       .exec();

//     // Filter doctors based on search query (query can match specialty, location, or name)
//     const filteredDoctors = doctors.filter((doctor) => {
//       // Convert everything to lowercase for case-insensitive comparison
//       const queryLower = query.toLowerCase();

//       const matchesSpecialty = doctor.specialty
//         .toLowerCase()
//         .includes(queryLower);
//       const matchesCity = doctor.location.city
//         .toLowerCase()
//         .includes(queryLower);
//       const matchesState = doctor.location.state
//         .toLowerCase()
//         .includes(queryLower);
//       const matchesFirstName = doctor.user.firstName
//         .toLowerCase()
//         .includes(queryLower);
//       const matchesLastName = doctor.user.lastName
//         .toLowerCase()
//         .includes(queryLower);

//       return (
//         matchesSpecialty ||
//         matchesCity ||
//         matchesState ||
//         matchesFirstName ||
//         matchesLastName
//       );
//     });

//     if (filteredDoctors.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No doctors found matching the query.",
//       });
//     }

//     // Return the filtered list of doctors
//     return res.status(200).json({
//       success: true,
//       data: filteredDoctors,
//     });
//   } catch (error) {
//     console.error("Search doctors error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

exports.searchDoctorsByQuery = async (req, res) => {
  try {
    const { query } = req.body; // This will be the search term (e.g., "Jane Smith")

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Please provide a search query.",
      });
    }

    // Search for doctors, including user population to access firstName and lastName
    const doctors = await Doctor.find()
      .populate("user", "firstName lastName specialty") // Populate the user data
      .exec();

    // Split query into terms to check for firstName, lastName, specialty, etc.
    const queryTerms = query.toLowerCase().split(" ").filter(Boolean); // Split and remove empty strings

    // Filter doctors based on search query (query can match specialty, location, or name)
    const filteredDoctors = doctors.filter((doctor) => {
      const firstNameMatch = doctor.user.firstName.toLowerCase();
      const lastNameMatch = doctor.user.lastName.toLowerCase();
      const specialtyMatch = doctor.specialty.toLowerCase();
      const cityMatch = doctor.location.city.toLowerCase();
      const stateMatch = doctor.location.state.toLowerCase();

      // Check if all query terms match either first name, last name, or other fields
      const matchesSpecialty = queryTerms.some((term) =>
        specialtyMatch.includes(term)
      );
      const matchesCity = queryTerms.some((term) => cityMatch.includes(term));
      const matchesState = queryTerms.some((term) => stateMatch.includes(term));

      // For firstName and lastName, we need to check both in any order
      const matchesFullName = queryTerms.every((term) => {
        return firstNameMatch.includes(term) || lastNameMatch.includes(term);
      });

      return matchesSpecialty || matchesCity || matchesState || matchesFullName;
    });

    if (filteredDoctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No doctors found matching the query.",
      });
    }

    // Return the filtered list of doctors
    return res.status(200).json({
      success: true,
      data: filteredDoctors,
    });
  } catch (error) {
    console.error("Search doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get doctor's availability
// @route   GET /api/availability/doctor/:doctorId
// @access  Public
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // Create query
    const query = { doctor: doctorId };

    // Add date filter if provided
    if (date) {
      const selectedDate = new Date(date);
      query.date = {
        $gte: new Date(selectedDate.setHours(0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59)),
      };
    } else {
      // Only show availability from today onwards
      query.date = { $gte: new Date() };
    }

    const availability = await Availability.find(query)
      .sort({ date: 1 })
      .populate({
        path: "doctor",
        populate: {
          path: "user", // Populating the user field inside the doctor document
          model: "User", // You need to specify the model name to populate the user
        },
      });

    res.status(200).json({
      success: true,
      count: availability.length,
      data: availability,
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Delete availability
// @route   DELETE /api/availability/:id
// @access  Private (Doctor only)
exports.deleteAvailability = async (req, res) => {
  try {
    // Find doctor associated with logged-in user
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor profile not found" });
    }

    // Find availability
    // const availability = await Availability.findById(req.params.id);

    const availability = await Availability.findOneAndUpdate(
      {
        doctor: doctor._id,
        "timeSlots._id": req.params.id,
        "timeSlots.isBooked": false,
      }, // Match doctor, date, and timeSlotId
      { $pull: { timeSlots: { _id: req.params.id } } }, // Remove the time slot by its ID
      { new: true, useFindAndModify: false } // Return the updated document
    );
    if (availability) {
      console.log("Slot deleted successfully");
      console.log("Updated availability:", availability);
    } else {
      console.log("Availability or time slot not found");
    }

    // // Check ownership
    // if (availability.doctor.toString() !== doctor._id.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to delete this availability",
    //   });
    // }

    // // Check if any slots are booked
    // const hasBookedSlots = availability.timeSlots.some((slot) => slot.isBooked);

    // if (hasBookedSlots) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete availability with booked appointments",
    //   });
    // }

    // await availability.remove();

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Delete availability error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
