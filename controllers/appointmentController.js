// server/controllers/appointmentController.js
const Appointment = require("../models/Appointment");
const Availability = require("../models/Availability");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// @desc    Book appointment
// @route   POST /api/appointments
// @access  Private (Patient only)
exports.bookAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      doctorId,
      locationName,
      locationAddress,
      date,
      startTime,
      endTime,
      reason,
    } = req.body;

    // Find patient associated with the logged-in user
    const patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Patient profile not found" });
    }

    // Parse date string to Date object
    const appointmentDate = new Date(date);

    console.log(appointmentDate);

    // Find doctor's availability
    const availability = await Availability.findOne({
      doctor: doctorId,
      date: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59)),
      },
      "consultationLocation.name": locationName,
      "consultationLocation.address": locationAddress,
      "timeSlots.startTime": startTime,
      "timeSlots.endTime": endTime,
      "timeSlots.isBooked": false,
    }).session(session);

    if (!availability) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Selected time slot is not available",
      });
    }

    // Find the specific time slot and mark it as booked
    const timeSlotIndex = availability.timeSlots.findIndex(
      (slot) =>
        slot.startTime === startTime &&
        slot.endTime === endTime &&
        !slot.isBooked
    );

    if (timeSlotIndex === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Selected time slot is not available",
      });
    }

    availability.timeSlots[timeSlotIndex].isBooked = true;
    await availability.save({ session });

    // Create appointment
    const appointment = await Appointment.create(
      [
        {
          patient: patient._id,
          doctor: doctorId,
          consultationLocation: {
            name: locationName,
            address: locationAddress,
          },
          date: appointmentDate,
          startTime,
          endTime,
          reason,
        },
      ],
      { session }
    );

    // Get doctor's email for notification
    const doctor = await Doctor.findById(doctorId).populate(
      "user",
      "email firstName lastName"
    );

    // Send email notifications
    const patientEmail = req.user.email;
    const doctorEmail = doctor.user.email;

    // Email to patient
    const patientMailOptions = {
      from: process.env.EMAIL_FROM,
      to: patientEmail,
      subject: "Appointment Confirmation",
      text: `Your appointment with Dr. ${doctor.user.firstName} ${doctor.user.lastName} has been scheduled for ${date} at ${startTime}.`,
      html: `<p>Your appointment with Dr. ${doctor.user.firstName} ${doctor.user.lastName} has been scheduled for ${date} at ${startTime}.</p>`,
    };

    // Email to doctor
    const doctorMailOptions = {
      from: process.env.EMAIL_FROM,
      to: doctorEmail,
      subject: "New Appointment",
      text: `You have a new appointment with ${req.user.firstName} ${req.user.lastName} on ${date} at ${startTime}.`,
      html: `<p>You have a new appointment with ${req.user.firstName} ${req.user.lastName} on ${date} at ${startTime}.</p>`,
    };

    await transporter.sendMail(patientMailOptions);
    await transporter.sendMail(doctorMailOptions);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: appointment[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Book appointment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private (Patient or Doctor)
exports.cancelAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const appointment = await Appointment.findById(req.params.id).session(
      session
    );

    if (!appointment) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Check if user is authorized to cancel
    let isAuthorized = false;

    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ user: req.user._id });
      isAuthorized = appointment.patient.toString() === patient._id.toString();
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: req.user._id });
      isAuthorized = appointment.doctor.toString() === doctor._id.toString();
    }

    if (!isAuthorized) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment",
      });
    }

    // Update appointment status
    appointment.status = "cancelled";
    await appointment.save({ session });

    // Find and update availability to free up the time slot
    const appointmentDate = new Date(appointment.date);

    await Availability.updateOne(
      {
        doctor: appointment.doctor,
        date: {
          $gte: new Date(appointmentDate.setHours(0, 0, 0)),
          $lt: new Date(appointmentDate.setHours(23, 59, 59)),
        },
        "consultationLocation.name": appointment.consultationLocation.name,
        "consultationLocation.address":
          appointment.consultationLocation.address,
        "timeSlots.startTime": appointment.startTime,
        "timeSlots.endTime": appointment.endTime,
      },
      {
        $set: {
          "timeSlots.$.isBooked": false,
        },
      },
      { session }
    );

    // Send cancellation notifications
    // Get emails
    const patient = await Patient.findById(appointment.patient).populate(
      "user",
      "email firstName lastName"
    );
    const doctor = await Doctor.findById(appointment.doctor).populate(
      "user",
      "email firstName lastName"
    );

    const patientEmail = patient.user.email;
    const doctorEmail = doctor.user.email;

    // Email to patient
    const patientMailOptions = {
      from: process.env.EMAIL_FROM,
      to: patientEmail,
      subject: "Appointment Cancelled",
      text: `Your appointment with Dr. ${doctor.user.firstName} ${
        doctor.user.lastName
      } on ${appointment.date.toDateString()} at ${
        appointment.startTime
      } has been cancelled.`,
      html: `<p>Your appointment with Dr. ${doctor.user.firstName} ${
        doctor.user.lastName
      } on ${appointment.date.toDateString()} at ${
        appointment.startTime
      } has been cancelled.</p>`,
    };

    // Email to doctor
    const doctorMailOptions = {
      from: process.env.EMAIL_FROM,
      to: doctorEmail,
      subject: "Appointment Cancelled",
      text: `Your appointment with ${patient.user.firstName} ${
        patient.user.lastName
      } on ${appointment.date.toDateString()} at ${
        appointment.startTime
      } has been cancelled.`,
      html: `<p>Your appointment with ${patient.user.firstName} ${
        patient.user.lastName
      } on ${appointment.date.toDateString()} at ${
        appointment.startTime
      } has been cancelled.</p>`,
    };

    await transporter.sendMail(patientMailOptions);
    await transporter.sendMail(doctorMailOptions);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Cancel appointment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
