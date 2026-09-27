const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const { createConsultation } = require("../controllers/consultationController");
const { syncAppointmentStatuses } = require("../services/appointmentStatus");
const Patient = require("../models/Patient");
const { getAnalytics } = require("../controllers/analyticsController");

const withStubs = async (stubs, callback) => {
  const originals = stubs.flatMap(([object, values]) =>
    Object.entries(values).map(([key, value]) => {
      const original = object[key];
      object[key] = value;
      return [object, key, original];
    })
  );

  try {
    await callback();
  } finally {
    for (const [object, key, original] of originals.reverse()) {
      object[key] = original;
    }
  }
};

const runCreateConsultation = async (status) => {
  const appointmentId = new mongoose.Types.ObjectId();
  const patientId = new mongoose.Types.ObjectId();
  let appointmentUpdate = null;
  let responseStatus = 200;
  let responseBody = null;

  await withStubs(
    [
      [Patient, {
        exists: async () => true
      }],
      [Appointment, {
        findById: () => ({
          select: () => ({ lean: async () => ({ patientId }) })
        }),
        updateMany: async (filter, update) => {
          appointmentUpdate = { filter, update };
          return { modifiedCount: 1 };
        }
      }],
      [Consultation, {
        create: async (consultation) => ({
          _id: new mongoose.Types.ObjectId(),
          ...consultation,
          status: consultation.status || "Completed"
        }),
        distinct: async (field, filter) => {
          assert.equal(field, "appointmentId");
          return filter.status === status ? [appointmentId] : [];
        }
      }]
    ],
    async () => {
      await createConsultation(
        {
          body: {
            appointmentId: String(appointmentId),
            patientId: String(patientId),
            consultationDate: new Date().toISOString(),
            serviceProvided: "Test service",
            notes: "In-memory controller test",
            status
          },
          user: { id: String(new mongoose.Types.ObjectId()), role: "bhw" }
        },
        {
          status(code) {
            responseStatus = code;
            return this;
          },
          json(body) {
            responseBody = body;
            return this;
          }
        }
      );
    }
  );

  return { appointmentId, appointmentUpdate, responseStatus, responseBody };
};

test("creating a completed consultation completes its linked appointment", async () => {
  const result = await runCreateConsultation("Completed");

  assert.equal(result.responseStatus, 201);
  assert.equal(result.responseBody.consultation.status, "Completed");
  assert.equal(
    String(result.appointmentUpdate.filter._id.$in[0]),
    String(result.appointmentId)
  );
  assert.deepEqual(result.appointmentUpdate.update, {
    $set: { status: "Completed" }
  });
});

test("a cancelled consultation cancels its linked appointment", async () => {
  const result = await runCreateConsultation("Cancelled");

  assert.equal(result.responseStatus, 201);
  assert.equal(result.responseBody.consultation.status, "Cancelled");
  assert.equal(
    String(result.appointmentUpdate.filter._id.$in[0]),
    String(result.appointmentId)
  );
  assert.deepEqual(result.appointmentUpdate.update, {
    $set: { status: "Cancelled" }
  });
});

test("legacy repair only promotes appointments linked to completed consultations", async () => {
  const appointmentId = new mongoose.Types.ObjectId();
  let update = null;

  await withStubs(
    [
      [Consultation, {
        distinct: async (field, filter) => {
          assert.equal(field, "appointmentId");
          return filter.status === "Completed" ? [appointmentId] : [];
        }
      }],
      [Appointment, {
        updateMany: async (filter, changes) => {
          update = { filter, changes };
          return { modifiedCount: 1 };
        }
      }]
    ],
    async () => {
      const changed = await syncAppointmentStatuses();
      assert.equal(changed, 1);
    }
  );

  assert.deepEqual(update.changes, { $set: { status: "Completed" } });
  assert.equal(update.filter.status.$ne, "Completed");
});

test("a completed consultation takes precedence over a cancelled record", async () => {
  const appointmentId = new mongoose.Types.ObjectId();
  const updates = [];

  await withStubs(
    [
      [Consultation, {
        distinct: async () => [appointmentId]
      }],
      [Appointment, {
        updateMany: async (filter, changes) => {
          updates.push({ filter, changes });
          return { modifiedCount: 1 };
        }
      }]
    ],
    async () => {
      await syncAppointmentStatuses();
    }
  );

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].changes, { $set: { status: "Completed" } });
});

test("analytics uses stored appointment and consultation statuses", async () => {
  let report = null;

  await withStubs(
    [
      [Patient, { countDocuments: async () => 3 }],
      [Appointment, {
        countDocuments: async () => 4,
        aggregate: async () => [
          { _id: "Pending", count: 1 },
          { _id: "Confirmed", count: 1 },
          { _id: "Completed", count: 1 },
          { _id: "Cancelled", count: 1 }
        ],
        distinct: async () => ["resident-1", "resident-2"],
        updateMany: async () => ({ modifiedCount: 0 })
      }],
      [Consultation, {
        countDocuments: async () => 3,
        aggregate: async (pipeline) =>
          pipeline.some((stage) => stage.$lookup)
            ? [
                { _id: { role: "bhw", status: "Completed" }, count: 1 },
                { _id: { role: "staff", status: "Cancelled" }, count: 2 }
              ]
            : [
                { _id: "Completed", count: 1 },
                { _id: "Cancelled", count: 2 }
              ],
        distinct: async (field, filter) => {
          if (field === "appointmentId") {
            return filter.status === "Completed"
              ? [new mongoose.Types.ObjectId()]
              : [];
          }
          return ["resident-1"];
        }
      }]
    ],
    async () => {
      await getAnalytics({}, {
        status() {
          return this;
        },
        json(body) {
          report = body;
          return this;
        }
      });
    }
  );

  assert.equal(report.pendingAppointments, 1);
  assert.equal(report.confirmedAppointments, 1);
  assert.equal(report.completedAppointments, 1);
  assert.equal(report.cancelledAppointments, 1);
  assert.equal(report.totalConsultations, 3);
  assert.equal(report.completedConsultations, 1);
  assert.equal(report.cancelledConsultations, 2);
  assert.equal(report.healthServicesProvided, 1);
  assert.equal(report.residentsWithAppointments, 2);
  assert.equal(report.residentsServed, 1);
  assert.equal(report.consultationsByRole.bhw.completed, 1);
  assert.equal(report.consultationsByRole.staff.cancelled, 2);
});
