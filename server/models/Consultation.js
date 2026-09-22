const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    healthWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    consultationDate: {
      type: Date,
      required: true
    },

    serviceProvided: {
      type: String,
      required: true,
      trim: true
    },

    notes: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["Completed", "Cancelled"],
      default: "Completed"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Consultation", consultationSchema);