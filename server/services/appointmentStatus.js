const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

/**
 * Consultation status is the source of truth once an appointment has a
 * consultation: completed consultations complete the appointment, and
 * cancelled consultations cancel it. A completed consultation takes
 * precedence if an appointment has multiple records. Passing appointment IDs
 * limits the reconciliation to those appointments.
 */
const syncAppointmentStatuses = async (appointmentId = null) => {
  const scope = { appointmentId: { $ne: null } };
  if (Array.isArray(appointmentId)) {
    if (appointmentId.length === 0) return 0;
    scope.appointmentId = { $in: appointmentId };
  } else if (appointmentId) {
    scope.appointmentId = appointmentId;
  }

  const [completedIds, cancelledIds] = await Promise.all([
    Consultation.distinct("appointmentId", { ...scope, status: "Completed" }),
    Consultation.distinct("appointmentId", { ...scope, status: "Cancelled" })
  ]);
  const completedIdSet = new Set(completedIds.map(String));
  const cancelledOnlyIds = cancelledIds.filter(
    (id) => !completedIdSet.has(String(id))
  );

  const updates = [];
  if (completedIds.length > 0) {
    updates.push(
      Appointment.updateMany(
        { _id: { $in: completedIds }, status: { $ne: "Completed" } },
        { $set: { status: "Completed" } }
      )
    );
  }
  if (cancelledOnlyIds.length > 0) {
    updates.push(
      Appointment.updateMany(
        { _id: { $in: cancelledOnlyIds }, status: { $ne: "Cancelled" } },
        { $set: { status: "Cancelled" } }
      )
    );
  }

  const results = await Promise.all(updates);
  return results.reduce((total, result) => total + (result.modifiedCount || 0), 0);
};

const hasCompletedConsultation = async (appointmentId) =>
  Boolean(
    await Consultation.exists({ appointmentId, status: "Completed" })
  );

module.exports = {
  syncAppointmentStatuses,
  hasCompletedConsultation
};
