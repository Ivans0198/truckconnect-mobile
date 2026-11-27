const MELBOURNE_TIME_ZONE = "Australia/Melbourne";
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

const timeFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone: MELBOURNE_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MELBOURNE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

const calendarDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: MELBOURNE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
});

// "6:35 AM". Intl en-AU escribe "am"/"pm" en minúscula; el mockup lleva mayúscula.
export function formatMelbourneTime(instant: string | Date): string {
  return timeFormat.format(new Date(instant)).toUpperCase();
}

export function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * MINUTES_PER_HOUR);
  const wholeHours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = String(totalMinutes % MINUTES_PER_HOUR).padStart(2, "0");
  return `${wholeHours}h ${minutes}m`;
}

export function formatBreakLength(ms: number): string {
  return `${Math.round(ms / MS_PER_MINUTE)} min`;
}

// Desfase de Melbourne respecto de UTC en ese instante, en ms.
function melbourneOffsetMs(instant: Date): number {
  const parts = new Map<string, number>();
  for (const part of partsFormat.formatToParts(instant)) {
    if (part.type !== "literal") parts.set(part.type, Number(part.value));
  }
  const field = (type: string): number => {
    const value = parts.get(type);
    if (value === undefined) throw new Error(`Intl returned no ${type}`);
    return value;
  };
  const asUtc = Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour"),
    field("minute"),
    field("second"),
  );
  const withoutMs = instant.getTime() - instant.getUTCMilliseconds();
  return asUtc - withoutMs;
}

// El instante UTC de la medianoche de Melbourne del día de `now`. El desfase
// se vuelve a medir en el candidato porque en un cambio de horario el de
// `now` y el de la medianoche pueden diferir.
export function startOfMelbourneDay(now: Date): Date {
  const localNow = new Date(now.getTime() + melbourneOffsetMs(now));
  const localMidnight = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  );
  const guess = new Date(localMidnight - melbourneOffsetMs(now));
  return new Date(localMidnight - melbourneOffsetMs(guess));
}

// "YYYY-MM-DD" es una fecha de calendario, sin zona: se lee en UTC para que
// el huso del teléfono no la corra de día.
export function formatWeekday(calendarDate: string): string {
  return weekdayFormat.format(new Date(`${calendarDate}T00:00:00.000Z`));
}

// "YYYY-MM-DD" del día de Melbourne en `now`, el mismo formato que trae
// `byDay[].date` del back.
export function melbourneCalendarDate(now: Date): string {
  return calendarDateFormat.format(now);
}

const MS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const MONTHS_FROM_DAYS = 60;
const CALENDAR_DATE_LENGTH = "YYYY-MM-DD".length;

// en-US da siempre la abreviatura de tres letras ("Jun", "Sep"); en-AU
// escribe "June" y "Sept" según la versión de ICU.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dayMonthFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: MELBOURNE_TIME_ZONE,
  day: "numeric",
  month: "short",
});

function formatDayMonth(format: Intl.DateTimeFormat, date: Date): string {
  const parts = format.formatToParts(date);
  const part = (type: string): string | undefined =>
    parts.find((candidate) => candidate.type === type)?.value;
  const day = part("day");
  const month = part("month");
  if (day === undefined || month === undefined) {
    throw new Error("Intl returned no day or month");
  }
  const year = part("year");
  return year === undefined ? `${day} ${month}` : `${day} ${month} ${year}`;
}

// El back manda `YYYY-MM-DD` o un instante; ambos terminan en el día de
// calendario de Melbourne.
function toMelbourneCalendarDate(value: string): string {
  if (value.length === CALENDAR_DATE_LENGTH) return value;
  return melbourneCalendarDate(new Date(value));
}

function calendarDateToUtcMs(calendarDate: string): number {
  return new Date(`${calendarDate}T00:00:00.000Z`).getTime();
}

// Días de calendario de Melbourne hasta el vencimiento: 0 el mismo día,
// negativo después.
export function melbourneDaysUntil(expiryDate: string, now: Date): number {
  const expiry = calendarDateToUtcMs(toMelbourneCalendarDate(expiryDate));
  const today = calendarDateToUtcMs(melbourneCalendarDate(now));
  return Math.round((expiry - today) / MS_PER_DAY);
}

// "14 Mar 2028".
export function formatMelbourneDate(value: string): string {
  const date = new Date(calendarDateToUtcMs(toMelbourneCalendarDate(value)));
  return formatDayMonth(dateFormat, date);
}

// "in 1y 10m", "in 6m", "in 32 days", "today". Un valor negativo se lee
// como "today": quien lo llama decide antes si el documento ya venció.
export function formatTimeLeft(days: number): string {
  if (days <= 0) return "today";
  if (days < MONTHS_FROM_DAYS)
    return `in ${days} ${days === 1 ? "day" : "days"}`;
  const years = Math.floor(days / DAYS_PER_YEAR);
  const months = Math.floor((days % DAYS_PER_YEAR) / DAYS_PER_MONTH);
  if (years === 0) return `in ${months}m`;
  return months === 0 ? `in ${years}y` : `in ${years}y ${months}m`;
}

function parseCalendarDate(calendarDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = calendarDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Not a calendar date: ${calendarDate}`);
  }
  return { year, month, day };
}

function wholeMonthsBetween(from: string, to: string): number {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  const months =
    (end.year - start.year) * MONTHS_PER_YEAR + (end.month - start.month);
  return end.day < start.day ? months - 1 : months;
}

// Antigüedad del conductor: "New", "8mo", "1y 2mo".
export function formatTenure(createdAt: string, now: Date): string {
  const months = wholeMonthsBetween(
    toMelbourneCalendarDate(createdAt),
    melbourneCalendarDate(now),
  );
  if (months < 1) return "New";
  const years = Math.floor(months / MONTHS_PER_YEAR);
  const rest = months % MONTHS_PER_YEAR;
  if (years === 0) return `${rest}mo`;
  return rest === 0 ? `${years}y` : `${years}y ${rest}mo`;
}

// "9:41 AM" hoy, "Yesterday" ayer, "12 Nov" antes.
export function formatNotificationTime(instant: string, now: Date): string {
  const sent = new Date(instant);
  const days = melbourneDaysUntil(melbourneCalendarDate(sent), now);
  if (days === 0) return formatMelbourneTime(sent);
  if (days === -1) return "Yesterday";
  return formatDayMonth(dayMonthFormat, sent);
}
