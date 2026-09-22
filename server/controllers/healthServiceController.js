const HealthService = require("../models/HealthService");

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

const deleteHealthService = async (req, res) => {
  try {
    const healthService = await HealthService.findByIdAndDelete(
      req.params.id
    );

    if (!healthService) {
      return res.status(404).json({
        message: "Health service not found."
      });
    }

    res.json({
      message: "Health service deleted successfully."
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