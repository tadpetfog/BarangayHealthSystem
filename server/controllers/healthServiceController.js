const mongoose = require("mongoose");
const HealthService = require("../models/HealthService");
const Appointment = require("../models/Appointment");

const createHealthService = async (req, res) => {
  try {
    const healthService = await HealthService.create(req.body);

    res.status(201).json({
      message: "Health service created successfully.",
      healthService
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create health service.",
      error: error.message
    });
  }
};

const getHealthServices = async (req, res) => {
  try {
    const healthServices = await HealthService.find();

    res.json(healthServices);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve health services.",
      error: error.message
    });
  }
};

const getHealthServiceById = async (req, res) => {
  try {
    const healthService = await HealthService.findById(req.params.id);

    if (!healthService) {
      return res.status(404).json({
        message: "Health service not found."
      });
    }

    res.json(healthService);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve health service.",
      error: error.message
    });
  }
};

const updateHealthService = async (req, res) => {
  try {
    const healthService = await HealthService.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!healthService) {
      return res.status(404).json({
        message: "Health service not found."
      });
    }

    res.json({
      message: "Health service updated successfully.",
      healthService
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update health service.",
      error: error.message
    });
  }
};

const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const SERVICE_IN_USE_MESSAGE =
  "This health service cannot be deleted because it is currently used by existing appointments. Please resolve or update those appointments first.";

/**
 * Counts the appointments that reference a health service, grouped by status.
 */
const countServiceUsage = async (serviceId) => {
  const rows = await Appointment.aggregate([
    { $match: { serviceId: new mongoose.Types.ObjectId(String(serviceId)) } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const usage = { total: 0 };

  for (const status of APPOINTMENT_STATUSES) {
    const row = rows.find((entry) => entry._id === status);
    usage[status.toLowerCase()] = row ? row.count : 0;
    usage.total += row ? row.count : 0;
  }

  return usage;
};

const serviceUsageResponse = (healthService, usage) => ({
  message:
    `${SERVICE_IN_USE_MESSAGE} (Used by ${usage.total} appointment` +
    `${usage.total === 1 ? "" : "s"}.)`,
  healthService: {
    id: healthService._id,
    name: healthService.name
  },
  appointments: usage
});

const deleteHealthService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Health service not found."
      });
    }

    const healthService = await HealthService.findById(id);

    if (!healthService) {
      return res.status(404).json({
        message: "Health service not found."
      });
    }

    // Health services are shared data: appointments store the service they were
    // booked for, so a service that any appointment still references is kept.
    // Appointments, patients, users and consultations are never removed as a
    // side effect of deleting a service.
    const usage = await countServiceUsage(healthService._id);

    if (usage.total > 0) {
      return res.status(409).json(serviceUsageResponse(healthService, usage));
    }

    // Checked again immediately before the delete so a booking that happens
    // while the administrator is confirming cannot end up pointing at nothing.
    const referenced = await Appointment.exists({
      serviceId: healthService._id
    });

    if (referenced) {
      const lateUsage = await countServiceUsage(healthService._id);

      return res.status(409).json(serviceUsageResponse(healthService, lateUsage));
    }

    await HealthService.findByIdAndDelete(healthService._id);

    res.json({
      message: `“${healthService.name}” was deleted successfully.`
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete health service.",
      error: error.message
    });
  }
};

module.exports = {
  createHealthService,
  getHealthServices,
  getHealthServiceById,
  updateHealthService,
  deleteHealthService
};