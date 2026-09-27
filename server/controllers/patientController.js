const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { runCascade, deletePatientWithRecords, describeRemoved } = require(
  "../config/dataIntegrity"
);
const {
  isResident,
  ownsPatient,
  ownsPatientId
} = require("../config/access");
const {
  buildAppointmentHistory
} = require("../controllers/consultationController");

const existingRecordMessage = (req) =>
  isResident(req.user)
    ? "You already have a patient record. Update it instead."
    : "That resident already has a patient record. Update it instead.";

const createPatient = async (req, res) => {
  try {
    const userId = isResident(req.user)
      ? req.user.id
      : req.body.userId || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "A valid resident account is required for a patient record."
      });
    }

    // Without this check a patient record could be created for an account that
    // no longer exists, which would leave an orphaned patient behind.
    const owner = await User.findById(userId).select("_id").lean();

    if (!owner) {
      return res.status(400).json({
        message:
          "That resident account no longer exists, so a patient record cannot be created for it."
      });
    }

    const existing = await Patient.findOne({ userId });

    if (existing) {
      return res.status(400).json({
        message: existingRecordMessage(req)
      });
    }

    const patient = await Patient.create({
      ...req.body,
      userId
    });

    res.status(201).json({
      message: "Patient record created successfully.",
      patient
    });
  } catch (error) {
    if (error && error.code === 11000) {
      // The unique index on Patient.userId rejected a second record.
      return res.status(400).json({
        message: existingRecordMessage(req)
      });
    }

    res.status(500).json({
      message: "Failed to create patient record.",
      error: error.message
    });
  }
};

const getPatients = async (req, res) => {
  try {
    const filter = isResident(req.user) ? { userId: req.user.id } : {};

    const patients = await Patient.find(filter).populate(
      "userId",
      "name email role"
    );

    res.json(patients);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve patients.",
      error: error.message
    });
  }
};

const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate(
      "userId",
      "name email role"
    );

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    if (isResident(req.user) && !ownsPatient(req.user, patient)) {
      return res.status(403).json({
        message: "You can only view your own patient record."
      });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve patient.",
      error: error.message
    });
  }
};

const updatePatient = async (req, res) => {
  try {
    const { userId, ...updates } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    if (isResident(req.user) && !ownsPatient(req.user, patient)) {
      return res.status(403).json({
        message: "You can only update your own patient record."
      });
    }

    if (!isResident(req.user) && userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: "A valid resident account is required for a patient record."
        });
      }

      const owner = await User.findById(userId).select("_id").lean();

      if (!owner) {
        return res.status(400).json({
          message:
            "That resident account no longer exists, so the patient record cannot be linked to it."
        });
      }

      const clash = await Patient.findOne({
        userId,
        _id: { $ne: patient._id }
      })
        .select("_id")
        .lean();

      if (clash) {
        return res.status(400).json({
          message: "That resident already has a patient record. Update it instead."
        });
      }

      updates.userId = userId;
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      message: "Patient record updated successfully.",
      patient: updatedPatient
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update patient record.",
      error: error.message
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    if (isResident(req.user) && !ownsPatient(req.user, patient)) {
      return res.status(403).json({
        message: "You can only delete your own patient record."
      });
    }

    // The patient's appointments and consultation history belong to the
    // patient, so they are removed with it instead of being orphaned.
    const removed = await runCascade((session) =>
      deletePatientWithRecords(patient, session)
    );

    const summary = describeRemoved({
      appointments: removed.appointments,
      consultations: removed.consultations
    });

    res.json({
      message: summary
        ? `Patient record deleted successfully. Also removed ${summary}.`
        : "Patient record deleted successfully.",
      removed
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete the patient record and its history.",
      error: error.message
    });
  }
};

const getPatientHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate(
      "userId",
      "name email role"
    );

    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }

    if (isResident(req.user) && !ownsPatient(req.user, patient)) {
      return res.status(403).json({
        message: "You can only view your own patient history."
      });
    }

    const history = await buildAppointmentHistory(patient._id);

    res.json({
      patient,
      history
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load patient history.",
      error: error.message
    });
  }
};

module.exports = {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientHistory
};