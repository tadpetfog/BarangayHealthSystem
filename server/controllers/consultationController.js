const mongoose = require('mongoose');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const { syncAppointmentStatuses } = require('../services/appointmentStatus');
const {
  isResident,
  ownPatientIds,
  ownsPatient
} = require('../config/access');

const CONSULTATION_STATUSES = ['Completed', 'Cancelled'];

const createConsultation = async (req, res) => {
  try {
    const patientId = req.body.patientId
      ? req.body.patientId._id || req.body.patientId
      : null;
    const appointmentId = req.body.appointmentId
      ? req.body.appointmentId._id || req.body.appointmentId
      : null;

    if (!patientId || !appointmentId) {
      return res.status(400).json({
        message:
          'A patient and an appointment are required to record a consultation.'
      });
    }

    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);

      if (!patientIds.some((id) => String(id) === String(patientId))) {
        return res.status(403).json({
          message:
            'You can only record consultations for your own patient record.'
        });
      }
    }

    // A consultation must point at records that still exist, otherwise it
    // would become an orphaned entry that no account or patient owns.
    const [patient, appointment] = await Promise.all([
      mongoose.Types.ObjectId.isValid(patientId)
        ? Patient.exists({ _id: patientId })
        : null,
      mongoose.Types.ObjectId.isValid(appointmentId)
        ? Appointment.findById(appointmentId).select('patientId').lean()
        : null
    ]);

    if (!patient) {
      return res.status(400).json({
        message:
          'The selected patient record no longer exists. Please refresh and try again.'
      });
    }

    if (!appointment) {
      return res.status(400).json({
        message:
          'The selected appointment no longer exists. Please refresh and try again.'
      });
    }

    if (String(appointment.patientId) !== String(patientId)) {
      return res.status(400).json({
        message: 'The selected patient does not match the chosen appointment.'
      });
    }

    const consultation = await Consultation.create({
      ...req.body,
      patientId,
      appointmentId,
      healthWorkerId: req.user.id
    });

    await syncAppointmentStatuses(appointmentId);

    res.status(201).json({
      message: 'Consultation recorded successfully.',
      consultation
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to record consultation.',
      error: error.message
    });
  }
};

const getConsultations = async (req, res) => {
  try {
    await syncAppointmentStatuses();

    const filter = isResident(req.user)
      ? { patientId: { $in: await ownPatientIds(req.user) } }
      : {};

    const consultations = await Consultation.find(filter)
      .populate('patientId')
      .populate('appointmentId')
      .populate('healthWorkerId', 'name email role');

    res.json(consultations);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve consultations.',
      error: error.message
    });
  }
};

const updateConsultation = async (req, res) => {
  try {
    if (req.body.status && !CONSULTATION_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        message:
          'Status must be one of: ' +
          CONSULTATION_STATUSES.join(', ') +
          '.'
      });
    }

    const existingConsultation = await Consultation.findById(req.params.id);

    if (!existingConsultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const updates = { ...req.body };
    delete updates.healthWorkerId;
    delete updates.patientId;
    delete updates.appointmentId;

    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    await syncAppointmentStatuses(consultation.appointmentId);

    res.json({
      message: 'Consultation updated successfully.',
      consultation
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update consultation.',
      error: error.message
    });
  }
};

const deleteConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    await Consultation.findByIdAndDelete(req.params.id);

    res.json({ message: 'Consultation deleted successfully.' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete consultation.',
      error: error.message
    });
  }
};

const completeConsultation = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const consultation = await Consultation.findById(consultationId)
      .populate('appointmentId')
      .populate('patientId');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    const appointment = consultation.appointmentId;
    if (!appointment) {
      return res.status(400).json({
        message: 'This consultation is not linked to an appointment.'
      });
    }

    if (
      isResident(req.user) &&
      !ownsPatient(req.user, consultation.patientId)
    ) {
      return res.status(403).json({
        message:
          'You can only complete consultations for your own patient record.'
      });
    }

    if (consultation.status !== 'Completed') {
      consultation.status = 'Completed';
      await consultation.save();
    }

    await syncAppointmentStatuses(appointment._id);

    const completed = await Consultation.findById(consultationId)
      .populate('appointmentId')
      .populate('patientId')
      .populate('healthWorkerId', 'name email role');

    res.json({
      message:
        'Consultation completed and appointment marked as completed.',
      consultation: completed
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to complete consultation.',
      error: error.message
    });
  }
};

const buildAppointmentHistory = async (patientId) => {
  if (!patientId) {
    return [];
  }

  const appointments = await Appointment.find({ patientId: patientId })
    .sort({ date: -1, createdAt: -1 })
    .populate('serviceId', 'name description')
    .lean();

  const appointmentIds = appointments
    .filter((a) => a._id)
    .map((a) => a._id.toString());

  await syncAppointmentStatuses(appointments.map((appointment) => appointment._id));

  let consultations = [];
  if (appointmentIds.length > 0) {
    consultations = await Consultation.find({
      appointmentId: { $in: appointmentIds }
    })
      .populate('healthWorkerId', 'name email role')
      .lean();
  }

  const consultationById = new Map();
  for (const c of consultations) {
    const linkedAppointmentId = c.appointmentId?._id || c.appointmentId;
    if (linkedAppointmentId) {
      const key = String(linkedAppointmentId);
      const existing = consultationById.get(key);
      if (
        !existing ||
        c.status === 'Completed' ||
        (existing.status !== 'Completed' && c.status === 'Cancelled')
      ) {
        consultationById.set(key, c);
      }
    }
  }

  const history = appointments.map((appointment) => {
    const consultation =
      consultationById.get(appointment._id.toString()) || null;

    return {
      _id: appointment._id,
      date: appointment.date,
      time: appointment.time,
      purpose: appointment.purpose,
      status:
        consultation?.status === 'Completed'
          ? 'Completed'
          : consultation?.status === 'Cancelled'
            ? 'Cancelled'
            : appointment.status,
      service:
        appointment.serviceId &&
        typeof appointment.serviceId === 'object'
          ? {
              _id: appointment.serviceId._id,
              name: appointment.serviceId.name,
              description: appointment.serviceId.description
            }
          : null,
      consultation:
        consultation
          ? {
              _id: consultation._id,
              status: consultation.status,
              serviceProvided: consultation.serviceProvided,
              notes: consultation.notes,
              completedAt:
                consultation.updatedAt ||
                consultation.createdAt ||
                null
            }
          : null,
      staff:
        consultation && consultation.healthWorkerId
          ? {
              _id: consultation.healthWorkerId._id,
              name:
                consultation.healthWorkerId.name ||
                consultation.healthWorkerId.email,
              role: consultation.healthWorkerId.role
            }
          : null
    };
  });

  return history;
};

const getPatientAppointmentHistory = async (req, res) => {
  try {
    const patientId =
      typeof req.params.patientId === 'string'
        ? req.params.patientId
        : req.params.patientId?._id;

    if (!patientId) {
      return res.status(400).json({
        message: 'Patient ID is required.'
      });
    }

    if (
      isResident(req.user) &&
      !ownsPatient(req.user, { userId: patientId })
    ) {
      return res.status(403).json({
        message: 'You can only view your own appointment history.'
      });
    }

    const history = await buildAppointmentHistory(patientId);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load patient appointment history.',
      error: error.message
    });
  }
};

module.exports = {
  createConsultation,
  getConsultations,
  updateConsultation,
  deleteConsultation,
  completeConsultation,
  getPatientAppointmentHistory,
  buildAppointmentHistory
};
