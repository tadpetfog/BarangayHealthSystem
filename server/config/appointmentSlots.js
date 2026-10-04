const Appointment = require("../models/Appointment");
const { parseTimeToMinutes, startOfDay } = require("./access");

const SLOT_CAPACITY = 5;
const SLOT_MINUTES = 60;

const BLOCKING_STATUSES = ["Pending", "Confirmed", "Completed"];

const LEGACY_SLOT_INDEX = "serviceId_1_date_1_time_1";

const getSlotStart = (time) => {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;
  return Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
};

const formatMinutes = (minutes) => {
  const hours24 = Math.floor(minutes / 60) % 24;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(minutes % 60).padStart(2, "0")} ${meridiem}`;
};

const describeSlot = (time) => {
  const start = getSlotStart(time);
  if (start === null) return null;
  return `${formatMinutes(start)} – ${formatMinutes(start + SLOT_MINUTES)}`;
};

const listSlotAppointments = async ({ serviceId, date, time }, excludeId = null) => {
  const day = startOfDay(date);
  const start = getSlotStart(time);
  if (!day || start === null) return [];

  const from = new Date(day);
  const to = new Date(day);
  to.setDate(to.getDate() + 1);

  const candidates = await Appointment.find({
    serviceId,
    date: { $gte: from, $lt: to },
    status: { $in: BLOCKING_STATUSES }
  })
    .select("_id time")
    .lean();

  return candidates.filter((appointment) => {
    if (excludeId && String(appointment._id) === String(excludeId)) return false;
    return getSlotStart(appointment.time) === start;
  });
};

const getSlotAvailability = async (query, excludeId = null) => {
  const booked = (await listSlotAppointments(query, excludeId)).length;

  return {
    capacity: SLOT_CAPACITY,
    booked,
    remaining: Math.max(SLOT_CAPACITY - booked, 0),
    full: booked >= SLOT_CAPACITY,
    slot: describeSlot(query.time)
  };
};

const dropLegacySlotIndex = async () => {
  try {
    const indexes = await Appointment.collection.indexes();
    const legacy = indexes.find(
      (index) => index.name === LEGACY_SLOT_INDEX && index.unique
    );

    if (!legacy) return false;

    await Appointment.collection.dropIndex(LEGACY_SLOT_INDEX);
    return true;
  } catch (error) {
    if (error?.codeName === "NamespaceNotFound") return false;

    console.warn(
      "Could not remove the old per-time appointment index:",
      error.message
    );
    return false;
  }
};

module.exports = {
  SLOT_CAPACITY,
  BLOCKING_STATUSES,
  getSlotStart,
  describeSlot,
  listSlotAppointments,
  getSlotAvailability,
  dropLegacySlotIndex
};