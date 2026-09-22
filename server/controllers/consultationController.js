const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const {
  isResident,
  ownPatientIds,
  ownsPatient
} = require('../config/access');

const CONSULTATION_STATUSES = ['Completed', 'Cancelled'];

const createConsultation = async (req, res) => {
  try {
    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);
      const patientId = req.body.patientId
        ? req.body.patientId._id || req.body.patientId
        : null;

      if (
        !patientId ||
        !patientIds.some((id) => String(id) === String(patientId))
      ) {
        return res.status(403).json({
          message:
            'You can only record consultations for your own patient record.'
        });
      }
    }

    const consultation = await Consultation.create({
      ...req.body,
      healthWorkerId: req.user.id
    });

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

    const { healthWorkerId, patientId, ...updates } = req.body;

    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

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

    if (consultation.status === 'Completed') {
      return res.status(400).json({
        message: 'This consultation has already been completed.'
      });
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

    consultation.status = 'Completed';
    await consultation.save();

    if (appointment.status !== 'Completed') {
      appointment.status = 'Completed';
      await appointment.save();
    }

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
    if (c.appointmentId?._id) {
      consultationById.set(
        c.appointmentId._id.toString(),
        c
      );
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
      status: appointment.status,
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
