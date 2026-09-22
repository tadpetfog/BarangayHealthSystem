const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    birthDate: {
      type: Date,
      required: true
    },

    sex: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Patient", patientSchema);