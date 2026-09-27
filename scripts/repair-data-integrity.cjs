// Maintenance script: reports and cleans up records that were left behind by
// older versions of the API and (re)creates the indexes that keep the
// collections consistent.
//
// Run it from the project root with:
//   node scripts/repair-data-integrity.cjs
//
// It only removes documents that are already unusable:
//   * patients whose owner account no longer exists
//   * duplicate patient records per account (the oldest record is kept and the
//     appointments / consultations of the duplicates are moved over to it)
//   * appointments without a patient, consultations without a patient,
//     appointment or health worker
//
// Appointments that point at a health service that no longer exists are only
// REPORTED by default, because an appointment holds patient scheduling
// information that must not be thrown away automatically. To repair them,
// re-run the script with one of these options:
//   --reassign-service=<healthServiceId>  move them onto an existing service
//   --delete-orphans                      delete them (only when intended)

const fs = require("fs");
const path = require("path");

const SERVER_DIR = path.join(__dirname, "..", "server");
const SERVER_MODULES = path.join(SERVER_DIR, "node_modules");

const mongoose = require(path.join(SERVER_MODULES, "mongoose"));
const User = require(path.join(SERVER_DIR, "models", "User.js"));
const Patient = require(path.join(SERVER_DIR, "models", "Patient.js"));
const Appointment = require(path.join(SERVER_DIR, "models", "Appointment.js"));
const Consultation = require(path.join(SERVER_DIR, "models", "Consultation.js"));
const HealthService = require(path.join(SERVER_DIR, "models", "HealthService.js"));
const {
  deletePatientDependants
} = require(path.join(SERVER_DIR, "config", "dataIntegrity.js"));

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

const counts = async () => ({
  users: await User.countDocuments(),
  patients: await Patient.countDocuments(),
  appointments: await Appointment.countDocuments(),
  consultations: await Consultation.countDocuments()
});

/** Removes patient records whose owner account no longer exists. */
const removeOrphanPatients = async () => {
  const ownerIds = await User.distinct("_id");
  const orphans = await Patient.find({ userId: { $nin: ownerIds } })
    .select("_id")
    .lean();

  if (orphans.length === 0) return { patients: 0, appointments: 0, consultations: 0 };

  const ids = orphans.map((patient) => patient._id);
  const dependants = await deletePatientDependants(ids, null);
  const removed = await Patient.deleteMany({ _id: { $in: ids } });

  return {
    patients: removed.deletedCount || 0,
    appointments: dependants.appointments,
    consultations: dependants.consultations
  };
};

/** Keeps the oldest patient record per account and merges the extra ones. */
const mergeDuplicatePatients = async () => {
  const patients = await Patient.find()
    .sort({ createdAt: 1, _id: 1 })
    .select("_id userId")
    .lean();

  const byOwner = new Map();

  for (const patient of patients) {
    const key = String(patient.userId);
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(patient._id);
  }

  const result = { patients: 0, appointments: 0, consultations: 0 };

  for (const ids of byOwner.values()) {
    if (ids.length < 2) continue;

    const [keepId, ...duplicateIds] = ids;

    for (const duplicateId of duplicateIds) {
      try {
        // Move the duplicate's history onto the record that is kept.
        await Appointment.updateMany(
          { patientId: duplicateId },
          { patientId: keepId }
        );
        await Consultation.updateMany(
          { patientId: duplicateId },
          { patientId: keepId }
        );
      } catch (error) {
        // The kept record already booked that slot, so the duplicate history
        // cannot be merged. Remove it instead of leaving it orphaned.
        const dependants = await deletePatientDependants([duplicateId], null);
        result.appointments += dependants.appointments;
        result.consultations += dependants.consultations;
      }

      const removed = await Patient.deleteOne({ _id: duplicateId });

      result.patients += removed.deletedCount || 0;
    }
  }

  return result;
};


/** Removes appointments that point at a patient record that is gone. */
const removeOrphanAppointments = async () => {
  const patientIds = await Patient.distinct("_id");
  const removed = await Appointment.deleteMany({
    patientId: { $nin: patientIds }
  });

  return removed.deletedCount || 0;
};

/** Removes consultations that point at a patient / appointment / worker that is gone. */
const removeOrphanConsultations = async () => {
  const [patientIds, appointmentIds, workerIds] = await Promise.all([
    Patient.distinct("_id"),
    Appointment.distinct("_id"),
    User.distinct("_id")
  ]);

  const removed = await Consultation.deleteMany({
    $or: [
      { patientId: { $nin: patientIds } },
      { appointmentId: { $nin: appointmentIds } },
      { healthWorkerId: { $nin: workerIds } }
    ]
  });

  return removed.deletedCount || 0;
};

/**
 * Finds appointments that point at a health service that no longer exists.
 * These are reported, never deleted automatically: the appointment itself is
 * valid information about a patient's schedule.
 */
const findAppointmentsWithMissingService = async () => {
  const serviceIds = await HealthService.distinct("_id");

  return Appointment.find({ serviceId: { $nin: serviceIds } })
    .select("_id patientId serviceId date time status")
    .sort({ date: 1, _id: 1 })
    .lean();
};

/**
 * Controlled repair for appointments whose health service is gone.
 * `reassignServiceId` moves them onto an existing service, `deleteOrphans`
 * removes them. Both are opt-in; without them nothing is changed.
 */
const repairAppointmentsWithMissingService = async ({
  reassignServiceId,
  deleteOrphans
}) => {
  const orphans = await findAppointmentsWithMissingService();

  if (orphans.length === 0) {
    return { found: 0, reassigned: 0, deleted: 0, orphans: [] };
  }

  const ids = orphans.map((appointment) => appointment._id);

  if (reassignServiceId) {
    const target = await HealthService.findById(reassignServiceId).lean();

    if (!target) {
      throw new Error(
        `The replacement health service ${reassignServiceId} does not exist.`
      );
    }

    const updated = await Appointment.updateMany(
      { _id: { $in: ids } },
      { serviceId: target._id }
    );

    return {
      found: orphans.length,
      reassigned: updated.modifiedCount || 0,
      deleted: 0,
      orphans,
      target
    };
  }

  if (deleteOrphans) {
    const removed = await Appointment.deleteMany({ _id: { $in: ids } });

    return {
      found: orphans.length,
      reassigned: 0,
      deleted: removed.deletedCount || 0,
      orphans
    };
  }

  return { found: orphans.length, reassigned: 0, deleted: 0, orphans };
};

/** Creates the indexes declared on the schemas (including the unique ones). */
const ensureIndexes = async () => {
  await Promise.all([
    User.createIndexes(),
    Patient.createIndexes(),
    Appointment.createIndexes(),
    Consultation.createIndexes()
  ]);
};

(async () => {
  const args = process.argv.slice(2);
  const reassignArg = args.find((arg) => arg.startsWith("--reassign-service="));
  const reassignServiceId = reassignArg
    ? reassignArg.split("=").slice(1).join("=").trim()
    : null;
  const deleteOrphans = args.includes("--delete-orphans");

  const uri = readMongoUri();

  console.log("Connecting to " + uri.replace(/\/\/[^@]*@/, "//***@") + " ...");
  await mongoose.connect(uri);

  const before = await counts();
  console.log("\nBefore repair:", before);

  const orphanPatients = await removeOrphanPatients();
  const duplicates = await mergeDuplicatePatients();
  const orphanAppointments = await removeOrphanAppointments();
  const orphanConsultations = await removeOrphanConsultations();

  // Appointments that lost their health service are reported (and repaired only
  // when the matching option was passed in).
  const serviceReferences = await repairAppointmentsWithMissingService({
    reassignServiceId,
    deleteOrphans
  });

  await ensureIndexes();

  const after = await counts();

  console.log("\nRemoved:");
  console.log("  patient records without an account: " + orphanPatients.patients);
  console.log("  duplicate patient records merged:   " + duplicates.patients);
  console.log(
    "  appointments:                       " +
      (orphanPatients.appointments + duplicates.appointments + orphanAppointments)
  );
  console.log(
    "  consultations:                      " +
      (orphanPatients.consultations +
        duplicates.consultations +
        orphanConsultations)
  );

  console.log("\nAfter repair:", after);

  console.log(
    "\nAppointments whose health service is missing: " + serviceReferences.found
  );

  for (const appointment of serviceReferences.orphans) {
    console.log(
      "   appointment " +
        String(appointment._id) +
        "  patient=" +
        String(appointment.patientId) +
        "  missing serviceId=" +
        String(appointment.serviceId) +
        "  " +
        (appointment.date
          ? new Date(appointment.date).toISOString().split("T")[0]
          : "?") +
        " " +
        (appointment.time || "") +
        "  [" +
        appointment.status +
        "]"
    );
  }

  if (serviceReferences.reassigned) {
    console.log(
      "   -> moved onto service " +
        String(serviceReferences.target._id) +
        " (" +
        serviceReferences.target.name +
        ")"
    );
  }

  if (serviceReferences.deleted) {
    console.log("   -> deleted: " + serviceReferences.deleted);
  }

  if (
    serviceReferences.found > 0 &&
    !serviceReferences.reassigned &&
    !serviceReferences.deleted
  ) {
    console.log(
      "   Nothing was changed. Re-run with --reassign-service=<healthServiceId>"
    );
    console.log(
      "   to move these appointments onto an existing service, or with"
    );
    console.log("   --delete-orphans to delete them.");
  }

  const remaining = {
    orphanPatients: await Patient.countDocuments({
      userId: { $nin: await User.distinct("_id") }
    }),
    orphanAppointments: await Appointment.countDocuments({
      patientId: { $nin: await Patient.distinct("_id") }
    }),
    orphanConsultations: await Consultation.countDocuments({
      $or: [
        { patientId: { $nin: await Patient.distinct("_id") } },
        { appointmentId: { $nin: await Appointment.distinct("_id") } },
        { healthWorkerId: { $nin: await User.distinct("_id") } }
      ]
    })
  };

  const totalRemaining = Object.values(remaining).reduce((a, b) => a + b, 0);
  const remainingServiceReferences = (
    await findAppointmentsWithMissingService()
  ).length;

  console.log("\nOrphans remaining:", remaining);
  console.log(
    "Appointments referencing a deleted health service: " +
      remainingServiceReferences
  );

  const patientIndexes = await Patient.collection.indexes();
  console.log(
    "patients indexes: " +
      patientIndexes
        .map(
          (index) => JSON.stringify(index.key) + (index.unique ? " unique" : "")
        )
        .join(" | ")
  );

  const appointmentIndexes = await Appointment.collection.indexes();
  console.log(
    "appointments indexes: " +
      appointmentIndexes
        .map(
          (index) =>
            JSON.stringify(index.key) +
            (index.unique ? " unique" : "") +
            (index.partialFilterExpression ? " partial" : "")
        )
        .join(" | ")
  );

  await mongoose.disconnect();

  if (totalRemaining > 0) {
    console.error("\nRepair finished but some orphans remain. Please re-run.");
    process.exit(1);
  }

  if (remainingServiceReferences > 0) {
    console.warn(
      "\n" +
        remainingServiceReferences +
        " appointment(s) still reference a health service that no longer exists." +
        "\nNothing was changed automatically — see the repair options above."
    );
  }

  console.log("\nData integrity repair completed successfully.");
})().catch(async (error) => {
  console.error("REPAIR FAILED: " + error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
