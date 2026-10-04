const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthService",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    time: {
      type: String,
      required: true
    },

    purpose: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

appointmentSchema.index({ patientId: 1 });

appointmentSchema.index({ serviceId: 1 });

appointmentSchema.index({ serviceId: 1, date: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);