const express = require("express");
const {
  createHealthService,
  getHealthServices,
  getHealthServiceById,
  updateHealthService,
  deleteHealthService
} = require("../controllers/healthServiceController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { HEALTH_CENTER_ROLES } = require("../config/access");

const router = express.Router();

router.post("/", protect, authorize(...HEALTH_CENTER_ROLES), createHealthService);
router.get("/", protect, getHealthServices);
router.get("/:id", protect, getHealthServiceById);
router.put("/:id", protect, authorize(...HEALTH_CENTER_ROLES), updateHealthService);
router.delete("/:id", protect, authorize(...HEALTH_CENTER_ROLES), deleteHealthService);

module.exports = router;