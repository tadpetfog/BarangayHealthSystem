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

// Used by the consultation lists and by the cascade cleanup.
consultationSchema.index({ patientId: 1 });
consultationSchema.index({ appointmentId: 1 });
consultationSchema.index({ healthWorkerId: 1 });

module.exports = mongoose.model("Consultation", consultationSchema);