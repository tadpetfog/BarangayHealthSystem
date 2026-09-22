const Appointment = require("../models/Appointment");
const HealthService = require("../models/HealthService");
const {
  isResident,
  isHealthCenter,
  ownPatientIds,
  ownsPatientId,
  startOfDay,
  checkServiceAvailability,
  parseTimeToMinutes
} = require("../config/access");

const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const BLOCKING_STATUSES = ["Pending", "Confirmed", "Completed"];

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

  const slot = await findBlockingAppointment({ serviceId, date, time }, excludeId);
  if (slot) {
    return {
      ok: false,
      status: 409,
      message:
        "This appointment slot is no longer available. Please select another date or time."
    };
  }

  return { ok: true, service };
};

const findBlockingAppointment = async ({ serviceId, date, time }, excludeId = null) => {
  const day = startOfDay(date);
  if (!day) return null;

  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;

  const start = new Date(day);
  const end = new Date(day);
  end.setDate(end.getDate() + 1);

  const candidates = await Appointment.find({
    serviceId,
    date: { $gte: start, $lt: end },
    status: { $in: BLOCKING_STATUSES }
  })
    .select("_id serviceId date time status")
    .lean();

  return (
    candidates.find((appt) => {
      if (excludeId && String(appt._id) === String(excludeId)) return false;
      return parseTimeToMinutes(appt.time) === minutes;
    }) || null
  );
};

const isDuplicateSlotError = (error) => error && error.code === 11000;

const createAppointment = async (req, res) => {
  try {
    if (isResident(req.user)) {
      const patientIds = await ownPatientIds(req.user);

      if (!ownsPatientId(patientIds, req.body.patientId)) {
        return res.status(403).json({
          message: "You can only book appointments for your own patient record."
        });
      }

      const appointment = await Appointment.create({
        patientId: req.body.patientId,
        serviceId: req.body.serviceId,
        date: req.body.date,
        time: req.body.time,
        purpose: req.body.purpose,
        status: "Pending"
      });

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

      const appointment = await Appointment.create({
        patientId,
        serviceId,
        date,
        time,
        purpose,
        status: status || "Pending"
      });

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

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ message: "Appointment deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete appointment.",
      error: error.message
    });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment
};
