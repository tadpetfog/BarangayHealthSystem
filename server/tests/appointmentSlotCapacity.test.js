const assert = require("node:assert/strict");
const { test } = require("node:test");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const HealthService = require("../models/HealthService");
const Patient = require("../models/Patient");
const {
  SLOT_CAPACITY,
  getSlotStart,
  describeSlot,
  getSlotAvailability,
  listSlotAppointments
} = require("../config/appointmentSlots");
const {
  createAppointment,
  updateAppointment
} = require("../controllers/appointmentController");

const DASH = "\u2013";

const withStubs = async (stubs, callback) => {
  const originals = stubs.flatMap(([object, values]) =>
    Object.entries(values).map(([key, value]) => {
      const original = object[key];
      object[key] = value;
      return [object, key, original];
    })
  );

  try {
    return await callback();
  } finally {
    for (const [object, key, original] of originals.reverse()) {
      object[key] = original;
    }
  }
};

const SERVICE_ID = new mongoose.Types.ObjectId();
const PATIENT_ID = new mongoose.Types.ObjectId();

const activeService = () => ({
  _id: SERVICE_ID,
  name: "Check-up",
  status: "Active",
  availableDays: ["Monday"],
  startTime: "08:00 AM",
  endTime: "05:00 PM"
});

const stubStoredAppointments = (appointments) => ({
  find: () => ({
    select: () => ({
      lean: async () => appointments
    })
  })
});

const captureResponse = () => {
  const result = { status: 200, body: null };

  return {
    res: {
      status(code) {
        result.status = code;
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      }
    },
    result
  };
};

const residentBooking = (overrides = {}) => ({
  body: {
    patientId: String(PATIENT_ID),
    serviceId: String(SERVICE_ID),
    date: "2026-03-02",
    time: "09:00 AM",
    purpose: "Check-up",
    ...overrides
  },
  user: { id: "resident-1", role: "resident" }
});

const residents = () => [
  [Patient, {
    find: () => ({
      select: () => ({ lean: async () => [{ _id: PATIENT_ID }] })
    })
  }]
];

const nthId = (n) =>
  new mongoose.Types.ObjectId(`00000000000000000000000${n}`);

const atTime = (time, n) => ({ _id: nthId(n), time });

const periodOf = (time) =>
  getSlotAvailability({
    serviceId: String(SERVICE_ID),
    date: "2026-03-02",
    time
  });

test("a booking time is placed in the one hour period it starts", () => {
  assert.equal(getSlotStart("8:00 AM"), 480);
  assert.equal(getSlotStart("09:00 AM"), 540);
  assert.equal(getSlotStart("9:30 AM"), 540);
  assert.equal(getSlotStart("09:59 AM"), 540);
  assert.equal(getSlotStart("10:00 AM"), 600);
  assert.equal(getSlotStart("12:00 PM"), 720);
  assert.equal(getSlotStart("12:30 PM"), 720);
  assert.equal(getSlotStart("11:59 PM"), 1380);
  assert.equal(getSlotStart("not a time"), null);
});

test("a period is labelled with its full one hour range", () => {
  assert.equal(describeSlot("8:00 AM"), `8:00 AM ${DASH} 9:00 AM`);
  assert.equal(describeSlot("9:45 AM"), `9:00 AM ${DASH} 10:00 AM`);
  assert.equal(describeSlot("12:00 PM"), `12:00 PM ${DASH} 1:00 PM`);
  assert.equal(describeSlot("oops"), null);
});

test("five residents fill a period and the sixth is refused", async () => {
  const five = [
    atTime("09:00 AM", 1),
    atTime("09:30 AM", 2),
    atTime("09:00 AM", 3),
    atTime("09:45 AM", 4),
    atTime("09:00 AM", 5)
  ];

  const full = await withStubs(
    [[Appointment, stubStoredAppointments(five)]],
    () => periodOf("09:00 AM")
  );

  assert.equal(full.capacity, 5);
  assert.equal(full.booked, 5);
  assert.equal(full.remaining, 0);
  assert.equal(full.full, true);
  assert.equal(full.slot, `9:00 AM ${DASH} 10:00 AM`);
});

test("remaining slots are reported while a period still has room", async () => {
  const three = [
    atTime("09:00 AM", 1),
    atTime("09:00 AM", 2),
    atTime("09:15 AM", 3)
  ];

  const open = await withStubs(
    [[Appointment, stubStoredAppointments(three)]],
    () => periodOf("09:15 AM")
  );

  assert.equal(open.booked, 3);
  assert.equal(open.remaining, 2);
  assert.equal(open.full, false);
  assert.equal(open.slot, `9:00 AM ${DASH} 10:00 AM`);
});

test("bookings in a neighbouring period do not fill this one", async () => {
  const elsewhere = [
    atTime("08:00 AM", 1),
    atTime("08:45 AM", 2),
    atTime("10:00 AM", 3)
  ];

  const open = await withStubs(
    [[Appointment, stubStoredAppointments(elsewhere)]],
    () => periodOf("09:00 AM")
  );

  assert.equal(open.booked, 0);
  assert.equal(open.remaining, 5);
  assert.equal(open.full, false);
});

test("only blocking statuses are counted in a period", async () => {
  let filter = null;

  await withStubs(
    [
      [Appointment, {
        find: (query) => {
          filter = query;
          return { select: () => ({ lean: async () => [] }) };
        }
      }]
    ],
    () =>
      listSlotAppointments({
        serviceId: String(SERVICE_ID),
        date: "2026-03-02",
        time: "09:00 AM"
      })
  );

  assert.deepEqual(filter.status.$in, ["Pending", "Confirmed", "Completed"]);
  assert.ok(!filter.status.$in.includes("Cancelled"));
});

test("rescheduling does not count the appointment against its own period", async () => {
  const stored = Array.from({ length: 5 }, (_, index) =>
    atTime("09:00 AM", index + 1)
  );
  const movingId = stored[4]._id;

  const availability = await withStubs(
    [[Appointment, stubStoredAppointments(stored)]],
    () =>
      getSlotAvailability(
        { serviceId: String(SERVICE_ID), date: "2026-03-02", time: "09:00 AM" },
        movingId
      )
  );

  assert.equal(availability.booked, 4);
  assert.equal(availability.full, false);
});

test("a sixth booking of a full period is rejected", async () => {
  const five = Array.from({ length: SLOT_CAPACITY }, (_, index) =>
    atTime("09:00 AM", index + 1)
  );
  const { res, result } = captureResponse();
  let created = false;

  await withStubs(
    [
      ...residents(),
      [HealthService, { exists: async () => true, findById: async () => activeService() }],
      [Appointment, {
        ...stubStoredAppointments(five),
        create: async () => {
          created = true;
          return {};
        }
      }]
    ],
    () => createAppointment(residentBooking(), res)
  );

  assert.equal(result.status, 409);
  assert.match(result.body.message, /fully booked/i);
  assert.equal(created, false);
});

test("the fifth booking of a period still succeeds", async () => {
  const four = Array.from({ length: SLOT_CAPACITY - 1 }, (_, index) =>
    atTime("09:00 AM", index + 1)
  );
  const { res, result } = captureResponse();
  let createArgs = null;

  await withStubs(
    [
      ...residents(),
      [HealthService, { exists: async () => true, findById: async () => activeService() }],
      [Appointment, {
        ...stubStoredAppointments(four),
        create: async (args) => {
          createArgs = args;
          return { _id: nthId(5), ...args };
        },
        deleteOne: async () => ({ deletedCount: 1 })
      }]
    ],
    () => createAppointment(residentBooking(), res)
  );

  assert.equal(result.status, 201);
  assert.equal(createArgs.time, "09:00 AM");
});

test("two residents racing for the last place leave the period at five", async () => {
  const stored = [
    atTime("09:00 AM", 1),
    atTime("09:00 AM", 2),
    atTime("09:00 AM", 3),
    atTime("09:00 AM", 4),
    atTime("09:00 AM", 5),
    atTime("09:00 AM", 6)
  ];
  const { res, result } = captureResponse();
  let deleted = null;
  let reads = 0;

  await withStubs(
    [
      ...residents(),
      [HealthService, { exists: async () => true, findById: async () => activeService() }],
      [Appointment, {
        find: () => {
          reads += 1;
          const seen = reads === 1 ? stored.slice(0, 4) : stored;
          return { select: () => ({ lean: async () => seen }) };
        },
        create: async () => ({
          _id: nthId(6),
          serviceId: SERVICE_ID,
          date: "2026-03-02",
          time: "09:00 AM"
        }),
        deleteOne: async (query) => {
          deleted = query;
          return { deletedCount: 1 };
        }
      }]
    ],
    () => createAppointment(residentBooking(), res)
  );

  assert.equal(result.status, 409);
  assert.match(result.body.message, /fully booked/i);
  assert.equal(String(deleted._id), String(nthId(6)));
});

test("rescheduling into a full period is rejected", async () => {
  const five = Array.from({ length: SLOT_CAPACITY }, (_, index) =>
    atTime("09:00 AM", index + 1)
  );
  const { res, result } = captureResponse();

  await withStubs(
    [
      ...residents(),
      [HealthService, { findById: async () => activeService() }],
      [Appointment, {
        ...stubStoredAppointments(five),
        findById: async () => ({
          _id: new mongoose.Types.ObjectId(),
          patientId: PATIENT_ID,
          serviceId: SERVICE_ID,
          status: "Pending"
        }),
        findByIdAndUpdate: async () => {
          throw new Error("a full period must be refused before the update");
        }
      }]
    ],
    () =>
      updateAppointment(
        {
          params: { id: String(new mongoose.Types.ObjectId()) },
          body: { date: "2026-03-02", time: "09:00 AM" },
          user: { id: "resident-1", role: "resident" }
        },
        res
      )
  );

  assert.equal(result.status, 409);
  assert.match(result.body.message, /fully booked/i);
});
