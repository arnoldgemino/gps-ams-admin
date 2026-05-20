export const PHILIPPINES_TIME_ZONE = "Asia/Manila";

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: PHILIPPINES_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: PHILIPPINES_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function normalizeDate(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatPhilippinesDateTime(value, fallback = "-") {
  const date = normalizeDate(value);
  if (!date) return fallback;
  return `${dateTimeFormatter.format(date)} PHT`;
}

export function formatPhilippinesTime(value, fallback = "-") {
  const date = normalizeDate(value);
  if (!date) return fallback;
  return `${timeFormatter.format(date)} PHT`;
}
