const express = require("express");
const { getAnalytics } = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { HEALTH_CENTER_ROLES } = require("../config/access");

const router = express.Router();

router.get("/", protect, authorize(...HEALTH_CENTER_ROLES), getAnalytics);

module.exports = router;