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
  return `${wholeHours}h ${totalMinutes % MINUTES_PER_HOUR}m`;
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
