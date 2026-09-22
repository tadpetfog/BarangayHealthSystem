const bcrypt = require("bcryptjs");
const User = require("../models/User");

const STATIC_ADMIN = {
  name: process.env.ADMIN_NAME || "Admin Test",
  email: (process.env.ADMIN_EMAIL || "admintest@gmail.com").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || "admin123",
  role: "admin"
};

const ensureStaticAdmin = async () => {
  const hashedPassword = await bcrypt.hash(STATIC_ADMIN.password, 10);

  await User.updateOne(
    { email: STATIC_ADMIN.email },
    {
      $set: {
        name: STATIC_ADMIN.name,
        password: hashedPassword,
        role: STATIC_ADMIN.role
      }
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return STATIC_ADMIN;
};

module.exports = { STATIC_ADMIN, ensureStaticAdmin };
