const express = require("express");
const {
  getUsers,
  getResidents,
  createUser,
  deleteUser
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { HEALTH_CENTER_ROLES } = require("../config/access");

const router = express.Router();

router.get("/residents", protect, authorize(...HEALTH_CENTER_ROLES), getResidents);

router.get("/", protect, authorize("admin"), getUsers);
router.post("/", protect, authorize("admin"), createUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
