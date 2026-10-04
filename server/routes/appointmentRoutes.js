const express = require("express");
const {
  createAppointment,
  getAppointments,
  getAppointmentSlot,
  updateAppointment,
  deleteAppointment
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/slot", protect, getAppointmentSlot);

router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.put("/:id", protect, updateAppointment);
router.delete("/:id", protect, deleteAppointment);

module.exports = router;
