const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const { STATIC_ADMIN } = require("../config/staticAdmin");

const CREATABLE_ROLES = ["bhw", "staff", "admin"];

const ROLE_ORDER = ["admin", "staff", "bhw", "resident"];

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    const accounts = users
      .sort(
        (a, b) =>
          ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
          a.name.localeCompare(b.name)
      )
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        isStatic: user.email === STATIC_ADMIN.email
      }));

    res.json(accounts);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve accounts.",
      error: error.message
    });
  }
};

const getResidents = async (req, res) => {
  try {
    const residents = await User.find({ role: "resident" })
      .select("name email")
      .sort({ name: 1 })
      .lean();

    res.json(
      residents.map((resident) => ({
        _id: resident._id,
        name: resident.name,
        email: resident.email
      }))
    );
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve residents.",
      error: error.message
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    if (!CREATABLE_ROLES.includes(role)) {
      return res.status(400).json({
        message:
          "Role must be one of: " +
          CREATABLE_ROLES.join(", ") +
          ". Residents create their own account from the register page."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === STATIC_ADMIN.email) {
      return res.status(400).json({
        message:
          "That email belongs to the administrator's static account and cannot be reused."
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        message: "Email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create account.",
      error: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    if (String(user._id) === String(req.user.id)) {
      return res.status(403).json({
        message:
          "You cannot delete the administrator account you are currently signed in with."
      });
    }

    if (user.email === STATIC_ADMIN.email) {
      return res.status(400).json({
        message:
          "The static administrator account is part of the system and cannot be deleted."
      });
    }

    await User.findByIdAndDelete(user._id);

    res.json({
      message: `${user.name} (${user.email}) account deleted successfully.`,
      deleted: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete account.",
      error: error.message
    });
  }
};

module.exports = {
  CREATABLE_ROLES,
  getUsers,
  getResidents,
  createUser,
  deleteUser
};
