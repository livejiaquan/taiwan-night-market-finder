export type ScheduleDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

const weekdays: ScheduleDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getTaipeiToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function addIsoDays(isoDate: string, amount: number): string {
  if (!isIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const parsed = new Date(`${isoDate}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function getScheduleDay(isoDate: string): ScheduleDay {
  if (!isIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return weekdays[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
}

export function getDateChoices(startDate: string, count = 7): string[] {
  return Array.from({ length: count }, (_, index) => addIsoDays(startDate, index));
}

export function formatDecisionDate(isoDate: string, locale: "zh" | "en") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    timeZone: "UTC",
    month: locale === "zh" ? "numeric" : "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatCompactDate(isoDate: string, locale: "zh" | "en") {
  if (!isIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}
