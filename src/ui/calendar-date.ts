const CALENDAR_DATE_PARTS = 3;
const MONTH_NUMBER_OFFSET = 1;
const DIGITS = 2;

const pad = (value: number): string => String(value).padStart(DIGITS, "0");

// El diálogo del teléfono trabaja con la fecha local: el día que el conductor
// tocó es el de calendario, sin pasar por UTC.
export function toCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + MONTH_NUMBER_OFFSET)}-${pad(date.getDate())}`;
}

export function fromCalendarDate(calendarDate: string): Date {
  const parts = calendarDate.split("-").map(Number);
  if (parts.length !== CALENDAR_DATE_PARTS || parts.some(Number.isNaN)) {
    throw new Error(`"${calendarDate}" is not a YYYY-MM-DD date`);
  }
  const [year, month, day] = parts as [number, number, number];
  return new Date(year, month - MONTH_NUMBER_OFFSET, day);
}
