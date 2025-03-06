// server/models/Availability.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const availabilitySchema = new Schema({
  doctor: {
    type: Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  consultationLocation: {
    name: { type: String, required: true },
    address: { type: String, required: true },
  },
  date: {
    type: Date,
    required: true,
  },
  timeSlots: [
    {
      startTime: { type: String, required: true }, // Format: "HH:MM"
      endTime: { type: String, required: true }, // Format: "HH:MM"
      isBooked: { type: Boolean, default: false },
    },
  ],
});

// Create compound index for fast lookup
availabilitySchema.index({ doctor: 1, date: 1 });

const Availability = mongoose.model("Availability", availabilitySchema);
module.exports = Availability;
