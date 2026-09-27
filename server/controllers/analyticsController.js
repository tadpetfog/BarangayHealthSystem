const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const User = require("../models/User");
const { syncAppointmentStatuses } = require("../services/appointmentStatus");

const countFor = (rows, status) =>
  rows.find((row) => row._id === status)?.count || 0;

const getAnalytics = async (req, res) => {
  try {
    // Reconcile appointments created before all write paths synchronized
    // their consultation, then calculate every metric from stored data.
    await syncAppointmentStatuses();

    const [
      totalPatients,
      totalAppointments,
      appointmentStatuses,
      totalConsultations,
      consultationStatuses,
      patientsWithAppointments,
      residentsServed,
      consultationRoleActivity
    ] = await Promise.all([
      Patient.countDocuments(),
      Appointment.countDocuments(),
      Appointment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Consultation.countDocuments(),
      Consultation.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Appointment.distinct("patientId"),
      Consultation.distinct("patientId", { status: "Completed" }),
      Consultation.aggregate([
        {
          $lookup: {
            from: User.collection.name,
            localField: "healthWorkerId",
            foreignField: "_id",
            as: "healthWorker"
          }
        },
        {
          $unwind: {
            path: "$healthWorker",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: {
              role: "$healthWorker.role",
              status: "$status"
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const consultationsByRole = {
      bhw: { total: 0, completed: 0, cancelled: 0 },
      staff: { total: 0, completed: 0, cancelled: 0 },
      admin: { total: 0, completed: 0, cancelled: 0 }
    };

    for (const row of consultationRoleActivity) {
      const role = row._id.role;
      const status = row._id.status;
      const activity = consultationsByRole[role];
      if (!activity) continue;

      activity.total += row.count;
      if (status === "Completed") activity.completed += row.count;
      if (status === "Cancelled") activity.cancelled += row.count;
    }

    const completedConsultations = countFor(consultationStatuses, "Completed");

    res.json({
      totalPatients,
      totalAppointments,
      pendingAppointments: countFor(appointmentStatuses, "Pending"),
      confirmedAppointments: countFor(appointmentStatuses, "Confirmed"),
      completedAppointments: countFor(appointmentStatuses, "Completed"),
      cancelledAppointments: countFor(appointmentStatuses, "Cancelled"),
      totalConsultations,
      completedConsultations,
      cancelledConsultations: countFor(consultationStatuses, "Cancelled"),
      healthServicesProvided: completedConsultations,
      residentsWithAppointments: patientsWithAppointments.length,
      residentsServed: residentsServed.length,
      consultationsByRole
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve analytics.",
      error: error.message
    });
  }
};

module.exports = {
  getAnalytics
};
