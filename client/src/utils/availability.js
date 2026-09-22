const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const parseTimeToMinutes = (value) => {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  const meridiem = text.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (meridiem) {
    let hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2] || 0);
    const half = meridiem[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (half === "P" && hours !== 12) hours += 12;
    if (half === "A" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const plain = text.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (plain) {
    const hours = Number(plain[1]);
    const minutes = Number(plain[2] || 0);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
};

const normalizeDay = (value) => String(value || "").trim().toLowerCase();

const parseBookingDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const checkBooking = (service, date, time) => {
  if (!service) {
    return {
      ok: false,
      message: "The selected health service no longer exists. Please choose another service."
    };
  }

  if (service.status && service.status !== "Active") {
    return {
      ok: false,
      message: `“${service.name}” is currently unavailable for booking. Please choose another service.`
    };
  }

  const bookingDate = parseBookingDate(date);
  if (!bookingDate) {
    return { ok: false, message: "Please select a valid appointment date." };
  }

  const dayName = DAYS_OF_WEEK[bookingDate.getDay()];
  const availableDays = Array.isArray(service.availableDays) ? service.availableDays : [];
  const dayAllowed = availableDays.some((d) => normalizeDay(d) === normalizeDay(dayName));

  if (!dayAllowed) {
    const days = availableDays.length ? availableDays.join(", ") : "its scheduled days";
    return {
      ok: false,
      message: `“${service.name}” is not available on ${dayName}s. Available days: ${days}.`
    };
  }

  const bookingMinutes = parseTimeToMinutes(time);
  const startMinutes = parseTimeToMinutes(service.startTime);
  const endMinutes = parseTimeToMinutes(service.endTime);

  if (bookingMinutes === null) {
    return {
      ok: false,
      message: "Please enter a valid time (for example “09:00 AM”)."
    };
  }

  if (startMinutes === null || endMinutes === null) {
    return {
      ok: false,
      message: `“${service.name}” does not have valid operating hours configured. Please contact the health center.`
    };
  }

  if (bookingMinutes < startMinutes || bookingMinutes > endMinutes) {
    return {
      ok: false,
      message: `“${service.name}” only accepts appointments from ${service.startTime} to ${service.endTime}. Please choose a time within that window.`
    };
  }

  return { ok: true, dayName };
};

export { DAYS_OF_WEEK, parseTimeToMinutes, parseBookingDate, checkBooking };