// server/models/Doctor.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const doctorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  specialty: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  }, // in years
  bio: {
    type: String,
  },
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String },
  },
  consultationFee: {
    type: Number,
  },
  consultationLocations: [
    {
      name: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
    },
  ],
});

// Create index for search functionality
doctorSchema.index({
  specialty: "text",
  "location.city": "text",
  "location.state": "text",
});

const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
