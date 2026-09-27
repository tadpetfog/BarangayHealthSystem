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

// One account owns at most one patient record. The API checks first, but the
// database enforces it as well so duplicate patient records cannot pile up.
patientSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("Patient", patientSchema);