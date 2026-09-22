
const fs = require("fs");
const path = require("path");

const SERVER_DIR = path.join(__dirname, "..", "server");
const SERVER_MODULES = path.join(SERVER_DIR, "node_modules");

const mongoose = require(path.join(SERVER_MODULES, "mongoose"));
const bcrypt = require(path.join(SERVER_MODULES, "bcryptjs"));
const { STATIC_ADMIN } = require(path.join(SERVER_DIR, "config", "staticAdmin.js"));

const STATIC_USERS = [
  {
    name: "BHW Test",
    email: "bhwtest@gmail.com",
    password: "bhw123",
    role: "bhw"
  },
  {
    name: "Staff Test",
    email: "stafftest@gmail.com",
    password: "staff123",
    role: "staff"
  },
  STATIC_ADMIN
];

function readMongoUri() {
  const envPath = path.join(SERVER_DIR, ".env");

  if (!fs.existsSync(envPath)) {
    return "mongodb://localhost:27017/barangay_health_db";
  }

  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("MONGO_URI"));

  return line
    ? line.split("=").slice(1).join("=").trim()
    : "mongodb://localhost:27017/barangay_health_db";
}

(async () => {
  const uri = readMongoUri();

  console.log("Connecting to " + uri.replace(/\/\/[^@]*@/, "//***@") + " ...");
  await mongoose.connect(uri);

  const users = mongoose.connection.db.collection("users");
  const results = [];

  for (const account of STATIC_USERS) {
    const email = account.email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(account.password, 10);
    const now = new Date();

    const res = await users.updateOne(
      { email },
      {
        $set: {
          name: account.name,
          email,
          password: hashedPassword,
          role: account.role,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    results.push({
      email,
      password: account.password,
      role: account.role,
      action: res.upsertedCount ? "created" : "updated"
    });
  }

  console.log("\n=== STATIC DEMO CREDENTIALS ===");
  for (const r of results) {
    const doc = await users.findOne({ email: r.email });
    const ok = await bcrypt.compare(r.password, doc.password);
    console.log(
      "  " +
        r.action.padEnd(8) +
        " " +
        r.email.padEnd(24) +
        " role=" +
        doc.role.padEnd(9) +
        " password=" +
        r.password.padEnd(11) +
        " hashMatches=" +
        ok
    );
  }

  console.log("\nTotal users now in `users`: " + (await users.countDocuments()));

  await mongoose.disconnect();
})().catch((err) => {
  console.error("SEED FAILED: " + err.message);
  process.exit(1);
});