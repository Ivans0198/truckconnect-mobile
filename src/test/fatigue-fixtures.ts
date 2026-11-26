import type { FatigueEvent, FatigueStatus, WeekSummary } from "@/fatigue/types";

const DRIVER_ID = "driver-1";

// Viernes 2026-11-27, 12:35 PM en Melbourne (horario de verano, UTC+11).
export const FATIGUE_NOW = new Date("2026-11-27T01:35:00.000Z");

// Mockup 12: 5h 30m trabajadas, próximo break en 2h 12m.
export const fatigueStatusFixture: FatigueStatus = {
  state: "working",
  driverId: DRIVER_ID,
  hoursWorked: 5.5,
  breakMinutes: 45,
  dayStartedAt: "2026-11-26T19:35:00.000Z",
  lastBreakEndAt: "2026-11-27T01:30:00.000Z",
  nextBreakDueAt: "2026-11-27T03:47:00.000Z",
  hoursRemaining: 6.5,
};

const event = (
  id: string,
  eventType: FatigueEvent["eventType"],
  timestamp: string,
): FatigueEvent => ({ id, eventType, driverId: DRIVER_ID, timestamp });

// 6:35 AM, 9:48 AM, 10:03 AM, 12:00 PM y 12:30 PM de Melbourne.
export const fatigueEventsFixture: FatigueEvent[] = [
  event("e1", "DAY_START", "2026-11-26T19:35:00.000Z"),
  event("e2", "BREAK_START", "2026-11-26T22:48:00.000Z"),
  event("e3", "BREAK_END", "2026-11-26T23:03:00.000Z"),
  event("e4", "BREAK_START", "2026-11-27T01:00:00.000Z"),
  event("e5", "BREAK_END", "2026-11-27T01:30:00.000Z"),
];

export const weekSummaryFixture: WeekSummary = {
  totalHoursWorked: 38.1667,
  remainingHours: 33.8333,
  byDay: [
    { date: "2026-11-23", hours: 7.8 },
    { date: "2026-11-24", hours: 9 },
    { date: "2026-11-25", hours: 6.0333 },
    { date: "2026-11-26", hours: 9.8333 },
    { date: "2026-11-27", hours: 5.5 },
  ],
};
