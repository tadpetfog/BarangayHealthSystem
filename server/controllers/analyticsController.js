const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

const getAnalytics = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({
      status: "Pending"
    });
    const completedAppointments = await Appointment.countDocuments({
      status: "Completed"
    });
    const cancelledAppointments = await Appointment.countDocuments({
      status: "Cancelled"
    });
    const totalConsultations = await Consultation.countDocuments();

    res.json({
      totalPatients,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalConsultations
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