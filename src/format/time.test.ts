import {
  formatBreakLength,
  formatHoursMinutes,
  formatMelbourneTime,
  formatWeekday,
  startOfMelbourneDay,
} from "./time";

describe("formatMelbourneTime", () => {
  it("shows Melbourne standard time (UTC+10) in winter", () => {
    expect(formatMelbourneTime("2026-07-14T20:35:00.000Z")).toBe("6:35 AM");
  });

  it("shows Melbourne daylight time (UTC+11) in summer", () => {
    expect(formatMelbourneTime("2026-11-22T19:35:00.000Z")).toBe("6:35 AM");
  });

  it("shows afternoon times with PM", () => {
    expect(formatMelbourneTime("2026-11-23T01:00:00.000Z")).toBe("12:00 PM");
  });
});

describe("formatHoursMinutes", () => {
  it("formats 5.5 hours as 5h 30m", () => {
    expect(formatHoursMinutes(5.5)).toBe("5h 30m");
  });

  it("pads the minutes to two digits", () => {
    expect(formatHoursMinutes(13)).toBe("13h 00m");
    expect(formatHoursMinutes(2.1)).toBe("2h 06m");
  });

  it("formats 0.75 hours as 0h 45m", () => {
    expect(formatHoursMinutes(0.75)).toBe("0h 45m");
  });
});

describe("formatBreakLength", () => {
  it("formats 15 minutes in ms as 15 min", () => {
    expect(formatBreakLength(15 * 60 * 1000)).toBe("15 min");
  });
});

describe("startOfMelbourneDay", () => {
  it("returns Melbourne midnight in UTC during daylight time", () => {
    const now = new Date("2026-11-23T03:00:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-11-22T13:00:00.000Z",
    );
  });

  it("returns Melbourne midnight in UTC during standard time", () => {
    const now = new Date("2026-07-14T03:00:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-07-13T14:00:00.000Z",
    );
  });

  it("stays on the same day one minute after local midnight", () => {
    const now = new Date("2026-11-22T13:01:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-11-22T13:00:00.000Z",
    );
  });

  it("is the previous day one minute before local midnight", () => {
    const now = new Date("2026-11-22T12:59:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-11-21T13:00:00.000Z",
    );
  });

  it("handles the spring-forward day (2026-10-04, 23 hours long)", () => {
    const now = new Date("2026-10-04T05:00:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-10-03T14:00:00.000Z",
    );
  });

  it("handles the day after spring-forward", () => {
    const now = new Date("2026-10-04T14:30:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-10-04T13:00:00.000Z",
    );
  });

  it("handles the fall-back day (2026-04-05, 25 hours long)", () => {
    const now = new Date("2026-04-05T05:00:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-04-04T13:00:00.000Z",
    );
  });

  it("handles the day after fall-back", () => {
    const now = new Date("2026-04-05T14:30:00.000Z");
    expect(startOfMelbourneDay(now).toISOString()).toBe(
      "2026-04-05T14:00:00.000Z",
    );
  });
});

describe("formatWeekday", () => {
  it("gives Mon for 2026-11-23", () => {
    expect(formatWeekday("2026-11-23")).toBe("Mon");
  });

  it("does not shift with the device time zone", () => {
    expect(formatWeekday("2026-11-27")).toBe("Fri");
  });
});
