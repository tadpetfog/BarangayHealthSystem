const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const HealthService = require("../models/HealthService");
const Patient = require("../models/Patient");
const {
  hasCompletedConsultation,
  syncAppointmentStatuses
} = require("../services/appointmentStatus");
const {
  runCascade,
  deleteAppointmentWithRecords,
  describeRemoved
} = require("../config/dataIntegrity");
const {
  SLOT_CAPACITY,
  describeSlot,
  listSlotAppointments,
  getSlotAvailability
} = require("../config/appointmentSlots");
const {
  isResident,
  isHealthCenter,
  ownPatientIds,
  ownsPatientId,
  checkServiceAvailability
} = require("../config/access");

const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const fullSlotMessage = (time) =>
  `${describeSlot(time) || "That time slot"} is fully booked (${SLOT_CAPACITY} residents per hour). Please select another date or time.`;

const validateBooking = async ({ serviceId, date, time }, excludeId = null) => {
  if (!serviceId || !date || !time) {
    return {
      ok: false,
      status: 400,
      message: "Patient, service, date and time are required."
    };
  }

  const service = await HealthService.findById(serviceId);

  const availability = checkServiceAvailability(service, date, time);
  if (!availability.ok) {
    return { ok: false, status: 400, message: availability.message };
  }

  const slot = await getSlotAvailability({ serviceId, date, time }, excludeId);
  if (slot.full) {
    return { ok: false, status: 409, message: fullSlotMessage(time) };
  }

  return { ok: true, service };
};

const reviewCreatedSlot = async (appointment) => {
  const booked = await listSlotAppointments({
    serviceId: appointment.serviceId,
    date: appointment.date,
    time: appointment.time
  });

  if (booked.length <= SLOT_CAPACITY) {
    return null;
  }

  const ordered = [...booked].sort((a, b) =>
    String(a._id).localeCompare(String(b._id))
  );
  const position = ordered.findIndex(
    (candidate) => String(candidate._id) === String(appointment._id)
  );

  if (position === -1 || position < SLOT_CAPACITY) {
    return null;
  }

  try {
    await Appointment.deleteOne({ _id: appointment._id });
  } catch (error) {
    console.error(
      `Could not roll back appointment ${appointment._id}: ${error.message}`
    );

    return {
      status: 500,
      message:
        "That time slot filled up while the appointment was being booked and the appointment could not be rolled back. Please contact the administrator."
    };
  }

  return { status: 409, message: fullSlotMessage(appointment.time) };
};

const isDuplicateSlotError = (error) => error && error.code === 11000;

const serviceLookup = async (serviceId) => {
  if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
    return {
      ok: false,
      status: 400,
      message: "A valid health service is required to book an appointment."
    };
  }

  const serviceExists = await HealthService.exists({ _id: serviceId });

  if (!serviceExists) {
    return {
      ok: false,
      status: 400,
      message:
        "The selected health service no longer exists. Please refresh the page and choose another service."
    };
  }

  return { ok: true };
};

const reviewCreatedAppointment = async (appointment, serviceId) => {
  const serviceStillExists = await HealthService.exists({ _id: serviceId });

  if (serviceStillExists) {
    return null;
  }

  try {
    await Appointment.deleteOne({ _id: appointment._id });
  } catch (error) {
    console.error(
      `Could not roll back appointment ${appointment._id}: ${error.message}`
    );

    return {
      status: 500,
      message:
        "That health service was removed while the appointment was being booked and the appointment could not be rolled back. Please contact the administrator."
    };
  }

  return {
    status: 409,
    message:
      "That health service was removed by an administrator while you were booking, so the appointment was not created. Please choose another service."
  };
};

const createAppointment = async (req, res) => {
  try {
    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);

      if (!ownsPatientId(patientIds, req.body.patientId)) {
        return res.status(403).json({
          message: "You can only book appointments for your own patient record."
        });
      }

      const serviceCheck = await serviceLookup(req.body.serviceId);

      if (!serviceCheck.ok) {
        return res.status(serviceCheck.status).json({
          message: serviceCheck.message
        });
      }

      const capacity = await getSlotAvailability({
        serviceId: req.body.serviceId,
        date: req.body.date,
        time: req.body.time
      });

      if (capacity.full) {
        return res.status(409).json({ message: fullSlotMessage(req.body.time) });
      }

      const appointment = await Appointment.create({
        patientId: req.body.patientId,
        serviceId: req.body.serviceId,
        date: req.body.date,
        time: req.body.time,
        purpose: req.body.purpose,
        status: "Pending"
      });

      const rejected = await reviewCreatedAppointment(
        appointment,
        req.body.serviceId
      );

      if (rejected) {
        return res.status(rejected.status).json({ message: rejected.message });
      }

      const overbooked = await reviewCreatedSlot(appointment);

      if (overbooked) {
        return res.status(overbooked.status).json({ message: overbooked.message });
      }

      return res.status(201).json({
        message: "Appointment created successfully.",
        appointment
      });
    }

    if (isHealthCenter(req.user)) {
      const { patientId, serviceId, date, time, purpose, status } = req.body;

      if (!patientId || !serviceId || !date || !time) {
        return res.status(400).json({
          message: "Patient, service, date and time are required."
        });
      }

      if (status && !APPOINTMENT_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Status must be one of: " + APPOINTMENT_STATUSES.join(", ") + "."
        });
      }

      if (status === "Completed") {
        return res.status(400).json({
          message:
            "An appointment is completed when its linked consultation is completed."
        });
      }

      const patient = mongoose.Types.ObjectId.isValid(patientId)
        ? await Patient.exists({ _id: patientId })
        : null;

      if (!patient) {
        return res.status(400).json({
          message:
            "The selected patient record no longer exists. Please refresh and choose another patient."
        });
      }

      const serviceCheck = await serviceLookup(serviceId);

      if (!serviceCheck.ok) {
        return res.status(serviceCheck.status).json({
          message: serviceCheck.message
        });
      }

      const capacity = await getSlotAvailability({ serviceId, date, time });

      if (capacity.full) {
        return res.status(409).json({ message: fullSlotMessage(time) });
      }

      const appointment = await Appointment.create({
        patientId,
        serviceId,
        date,
        time,
        purpose,
        status: status || "Pending"
      });

      const rejected = await reviewCreatedAppointment(appointment, serviceId);

      if (rejected) {
        return res.status(rejected.status).json({ message: rejected.message });
      }

      const overbooked = await reviewCreatedSlot(appointment);

      if (overbooked) {
        return res.status(overbooked.status).json({ message: overbooked.message });
      }

      return res.status(201).json({
        message: "Appointment created successfully.",
        appointment
      });
    }

    return res.status(403).json({
      message: "Not authorized to create appointments."
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create appointment.",
      error: error.message
    });
  }
};

const getAppointments = async (req, res) => {
  try {
    await syncAppointmentStatuses();

    const { patientId } = req.query;

    if (isResident(req.user)) {
      const ownIds = await ownPatientIds(req.user);

      if (patientId && !ownsPatientId(ownIds, patientId)) {
        return res.status(403).json({
          message: "You can only view your own appointment history."
        });
      }

      const owned = ownIds.map((id) => String(id));
      const filter = patientId
        ? { patientId: { $in: owned.filter((id) => id === String(patientId)) } }
        : { patientId: { $in: owned } };

      const appointments = await Appointment.find(filter)
        .populate("patientId")
        .populate("serviceId");

      return res.json(appointments);
    }

    const filter = patientId ? { patientId } : {};

    const appointments = await Appointment.find(filter)
      .populate("patientId")
      .populate("serviceId");

    res.json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve appointments.",
      error: error.message
    });
  }
};

const getAppointmentSlot = async (req, res) => {
  try {
    const { serviceId, date, time } = req.query;

    if (!serviceId || !date || !time) {
      return res.status(400).json({
        message: "Service, date and time are required."
      });
    }

    const availability = await getSlotAvailability({ serviceId, date, time });

    return res.json(availability);
  } catch (error) {
    res.status(500).json({
      message: "Failed to check the appointment slot.",
      error: error.message
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found."
      });
    }

    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);

      if (!ownsPatientId(patientIds, appointment.patientId)) {
        return res.status(403).json({
          message: "You can only edit, reschedule or cancel your own appointments."
        });
      }

      if (req.body.status && !APPOINTMENT_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          message: "Status must be one of: " + APPOINTMENT_STATUSES.join(", ") + "."
        });
      }

      if (
        req.body.status === "Completed" &&
        appointment.status !== "Completed" &&
        !(await hasCompletedConsultation(appointment._id))
      ) {
        return res.status(400).json({
          message:
            "An appointment is completed when its linked consultation is completed."
        });
      }

      const { patientId, ...updates } = req.body;

      const rescheduling =
        updates.date !== undefined || updates.time !== undefined || updates.serviceId !== undefined;

      if (rescheduling) {
        const check = await validateBooking(
          {
            serviceId: updates.serviceId || appointment.serviceId,
            date: updates.date || appointment.date,
            time: updates.time || appointment.time
          },
          appointment._id
        );

        if (!check.ok) {
          return res.status(check.status).json({ message: check.message });
        }
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      ).catch((error) => {
        if (isDuplicateSlotError(error)) return null;
        throw error;
      });

      if (!updatedAppointment) {
        return res.status(409).json({
          message: "This appointment slot is no longer available. Please select another date or time."
        });
      }

      await syncAppointmentStatuses(updatedAppointment._id);
      if (await hasCompletedConsultation(updatedAppointment._id)) {
        updatedAppointment.status = "Completed";
      }

      return res.json({
        message: "Appointment updated successfully.",
        appointment: updatedAppointment
      });
    }

    if (isHealthCenter(req.user)) {
      if (req.body.status && !APPOINTMENT_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          message: "Status must be one of: " + APPOINTMENT_STATUSES.join(", ") + "."
        });
      }

      if (
        req.body.status === "Completed" &&
        appointment.status !== "Completed" &&
        !(await hasCompletedConsultation(appointment._id))
      ) {
        return res.status(400).json({
          message:
            "An appointment is completed when its linked consultation is completed."
        });
      }

      const movingSlot =
        req.body.date !== undefined ||
        req.body.time !== undefined ||
        req.body.serviceId !== undefined;

      if (movingSlot) {
        const check = await validateBooking(
          {
            serviceId: req.body.serviceId || appointment.serviceId,
            date: req.body.date || appointment.date,
            time: req.body.time || appointment.time
          },
          appointment._id
        );

        if (!check.ok) {
          return res.status(check.status).json({ message: check.message });
        }
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).catch((error) => {
        if (isDuplicateSlotError(error)) return null;
        throw error;
      });

      if (!updatedAppointment) {
        return res.status(409).json({
          message: "This appointment slot is no longer available. Please select another date or time."
        });
      }

      await syncAppointmentStatuses(updatedAppointment._id);
      if (await hasCompletedConsultation(updatedAppointment._id)) {
        updatedAppointment.status = "Completed";
      }

      return res.json({
        message: "Appointment updated successfully.",
        appointment: updatedAppointment
      });
    }

    return res.status(403).json({
      message: "Not authorized to update appointments."
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update appointment.",
      error: error.message
    });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found."
      });
    }

    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);

      if (!ownsPatientId(patientIds, appointment.patientId)) {
        return res.status(403).json({
          message: "You can only delete your own appointments."
        });
      }
    } else if (!isHealthCenter(req.user)) {
      return res.status(403).json({
        message: "Not authorized to delete appointments."
      });
    }

    const removed = await runCascade((session) =>
      deleteAppointmentWithRecords(appointment, session)
    );

    const summary = describeRemoved({ consultations: removed.consultations });

    res.json({
      message: summary
        ? `Appointment deleted successfully. Also removed ${summary}.`
        : "Appointment deleted successfully.",
      removed
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete the appointment and its consultations.",
      error: error.message
    });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentSlot,
  updateAppointment,
  deleteAppointment
};
