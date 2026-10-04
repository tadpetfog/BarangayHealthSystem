const mongoose = require("mongoose");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

/**
 * Referential integrity helpers.
 *
 * MongoDB has no foreign keys, so every deletion path in the API runs through
 * the helpers below. Records that depend on another record (appointments that
 * belong to a patient, consultations that belong to a patient / appointment /
 * health worker) are always removed before the record they point at, which
 * keeps the collections free of orphaned documents.
 *
 * A MongoDB deployment that supports transactions (a replica set or a sharded
 * cluster) runs the whole cascade inside one session, so nothing is left
 * behind on failure. A standalone deployment (the local development setup)
 * cannot use transactions, so the cascade runs sequentially with the account
 * removed last and is retried once if it is interrupted.
 */

const sessionOptions = (session, extra = {}) =>
  session ? { ...extra, session } : { ...extra };

const withSession = (query, session) => (session ? query.session(session) : query);

const idsOf = (documents) => documents.map((document) => document._id);

let transactionSupport = null;

const supportsTransactions = async () => {
  if (transactionSupport !== null) return transactionSupport;

  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupport = Boolean(info.setName) || info.msg === "isdbgrid";
  } catch (error) {
    transactionSupport = false;
  }

  return transactionSupport;
};

/**
 * Runs a cascade either inside a transaction (when the deployment supports it)
 * or sequentially with one retry, so a partial cleanup is avoided as much as
 * possible. Every cascade step is idempotent, which makes the retry safe.
 */
const runCascade = async (work) => {
  if (await supportsTransactions()) {
    const session = await mongoose.startSession();

    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  try {
    return await work(null);
  } catch (error) {
    console.warn("Cascade delete was interrupted, retrying once:", error.message);
    return work(null);
  }
};

/** True when the connected deployment can run multi-document transactions. */
const transactionsAvailable = () =>
  transactionSupport === null
    ? supportsTransactions()
    : Promise.resolve(transactionSupport);

/** Deletes every appointment and consultation owned by the given patients. */
const deletePatientDependants = async (patientIds, session) => {
  const ids = (patientIds || []).filter(Boolean);

  if (ids.length === 0) {
    return { appointments: 0, consultations: 0 };
  }

  const appointments = await withSession(
    Appointment.find({ patientId: { $in: ids } }).select("_id").lean(),
    session
  );
  const appointmentIds = idsOf(appointments);

  const removedConsultations = await Consultation.deleteMany(
    {
      $or: [
        { patientId: { $in: ids } },
        { appointmentId: { $in: appointmentIds } }
      ]
    },
    sessionOptions(session)
  );

  const removedAppointments = await Appointment.deleteMany(
    { _id: { $in: appointmentIds } },
    sessionOptions(session)
  );

  return {
    appointments: removedAppointments.deletedCount || 0,
    consultations: removedConsultations.deletedCount || 0
  };
};

/** Deletes the consultations recorded for the given appointments. */
const deleteAppointmentDependants = async (appointmentIds, session) => {
  const ids = (appointmentIds || []).filter(Boolean);

  if (ids.length === 0) {
    return { consultations: 0 };
  }

  const removedConsultations = await Consultation.deleteMany(
    { appointmentId: { $in: ids } },
    sessionOptions(session)
  );

  return { consultations: removedConsultations.deletedCount || 0 };
};

/** Deletes one patient record together with its appointments/consultations. */
const deletePatientWithRecords = async (patient, session) => {
  const dependants = await deletePatientDependants([patient._id], session);

  const removedPatient = await Patient.deleteOne(
    { _id: patient._id },
    sessionOptions(session)
  );

  return {
    patients: removedPatient.deletedCount || 0,
    appointments: dependants.appointments,
    consultations: dependants.consultations
  };
};

/** Deletes one appointment together with the consultations recorded for it. */
const deleteAppointmentWithRecords = async (appointment, session) => {
  const dependants = await deleteAppointmentDependants(
    [appointment._id],
    session
  );

  const removedAppointment = await Appointment.deleteOne(
    { _id: appointment._id },
    sessionOptions(session)
  );

  return {
    appointments: removedAppointment.deletedCount || 0,
    consultations: dependants.consultations
  };
};

/**
 * Deletes an account and everything that belongs to it: patient record(s),
 * their appointments and consultations, plus consultations recorded by the
 * account as a health worker. Shared data such as health service definitions
 * is never touched.
 */
const deleteUserWithRecords = async (user, session) => {
  const patients = await withSession(
    Patient.find({ userId: user._id }).select("_id").lean(),
    session
  );
  const patientIds = idsOf(patients);

  const dependants = await deletePatientDependants(patientIds, session);

  const removedWorkerConsultations = await Consultation.deleteMany(
    { healthWorkerId: user._id },
    sessionOptions(session)
  );

  const removedPatients = await Patient.deleteMany(
    { _id: { $in: patientIds } },
    sessionOptions(session)
  );

  const removedUser = await User.deleteOne(
    { _id: user._id },
    sessionOptions(session)
  );

  if (removedUser.deletedCount === 0) {
    // The account was already removed by someone else (or by the first attempt
    // of a retry). That is only a failure if it is somehow still there.
    const stillExists = await User.exists(
      { _id: user._id },
      sessionOptions(session)
    );

    if (stillExists) {
      throw new Error("The account record could not be removed.");
    }
  }

  return {
    patients: removedPatients.deletedCount || 0,
    appointments: dependants.appointments,
    consultations:
      dependants.consultations + (removedWorkerConsultations.deletedCount || 0)
  };
};

/** Turns a cascade result into a short human readable summary. */
const describeRemoved = ({
  patients = 0,
  appointments = 0,
  consultations = 0
} = {}) => {
  return [
    { count: patients, label: "patient record" },
    { count: appointments, label: "appointment" },
    { count: consultations, label: "consultation record" }
  ]
    .filter((entry) => entry.count > 0)
    .map(
      (entry) => `${entry.count} ${entry.label}${entry.count === 1 ? "" : "s"}`
    )
    .join(", ");
};

module.exports = {
  runCascade,
  transactionsAvailable,
  deletePatientDependants,
  deletePatientWithRecords,
  deleteAppointmentWithRecords,
  deleteUserWithRecords,
  describeRemoved
};
