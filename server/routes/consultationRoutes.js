const express = require("express");
const {
  createConsultation,
  getConsultations,
  updateConsultation,
  deleteConsultation,
  completeConsultation,
  getPatientAppointmentHistory
} = require("../controllers/consultationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { HEALTH_CENTER_ROLES } = require("../config/access");

const router = express.Router();

router.post("/", protect, authorize(...HEALTH_CENTER_ROLES), createConsultation);
router.get("/", protect, getConsultations);
router.put("/:id", protect, authorize(...HEALTH_CENTER_ROLES), updateConsultation);
router.delete("/:id", protect, authorize(...HEALTH_CENTER_ROLES), deleteConsultation);

router.post(
  "/:id/complete",
  protect,
  completeConsultation
);

module.exports = router;