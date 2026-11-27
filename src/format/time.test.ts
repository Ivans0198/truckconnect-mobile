import {
  formatBreakLength,
  formatHoursMinutes,
  formatMelbourneDate,
  formatMelbourneTime,
  formatNotificationTime,
  formatTenure,
  formatTimeLeft,
  formatWeekday,
  melbourneCalendarDate,
  melbourneDaysUntil,
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

describe("melbourneCalendarDate", () => {
  it("gives the Melbourne day, not the UTC one", () => {
    // 2026-11-26T19:35Z ya es el 27 en Melbourne (UTC+11).
    expect(melbourneCalendarDate(new Date("2026-11-26T19:35:00.000Z"))).toBe(
      "2026-11-27",
    );
  });
});

describe("melbourneDaysUntil", () => {
  const noon = new Date("2026-11-27T01:35:00.000Z"); // 12:35 PM in Melbourne

  it("is 0 on the expiry day", () => {
    expect(melbourneDaysUntil("2026-11-27", noon)).toBe(0);
  });

  it("is negative the day after the expiry", () => {
    expect(melbourneDaysUntil("2026-11-26", noon)).toBe(-1);
  });

  it("counts calendar days ahead", () => {
    expect(melbourneDaysUntil("2026-12-05", noon)).toBe(8);
  });

  it("counts Melbourne midnight, not UTC midnight", () => {
    // 00:30 on the 27th in Melbourne, still the 26th in UTC.
    const afterMelbourneMidnight = new Date("2026-11-26T13:30:00.000Z");
    expect(melbourneDaysUntil("2026-11-27", afterMelbourneMidnight)).toBe(0);
    expect(melbourneDaysUntil("2026-11-26", afterMelbourneMidnight)).toBe(-1);
  });

  it("reads a date-time expiry as its Melbourne calendar day", () => {
    expect(melbourneDaysUntil("2026-11-27T00:00:00.000Z", noon)).toBe(0);
  });

  it("is not moved by a daylight saving change in between", () => {
    const beforeSummerTime = new Date("2026-10-01T01:00:00.000Z");
    expect(melbourneDaysUntil("2026-10-10", beforeSummerTime)).toBe(9);
  });
});

describe("formatMelbourneDate", () => {
  it("writes day, short month and year", () => {
    expect(formatMelbourneDate("2028-03-14")).toBe("14 Mar 2028");
  });

  it("reads a date-time as its Melbourne day", () => {
    expect(formatMelbourneDate("2026-06-17T00:00:00.000Z")).toBe("17 Jun 2026");
  });
});

describe("formatTimeLeft", () => {
  it("says years and months for more than a year", () => {
    expect(formatTimeLeft(670)).toBe("in 1y 10m");
  });

  it("says only months from two months out", () => {
    expect(formatTimeLeft(185)).toBe("in 6m");
  });

  it("says days under two months", () => {
    expect(formatTimeLeft(32)).toBe("in 32 days");
    expect(formatTimeLeft(1)).toBe("in 1 day");
  });

  it("says today on the expiry day", () => {
    expect(formatTimeLeft(0)).toBe("today");
  });

  it("drops the months when they are zero", () => {
    expect(formatTimeLeft(366)).toBe("in 1y");
  });
});

describe("formatTenure", () => {
  const now = new Date("2026-11-27T01:35:00.000Z");

  it("is New under a month", () => {
    expect(formatTenure("2026-11-02T00:00:00.000Z", now)).toBe("New");
  });

  it("counts whole months", () => {
    expect(formatTenure("2026-03-20T00:00:00.000Z", now)).toBe("8mo");
  });

  it("counts years and months", () => {
    expect(formatTenure("2025-09-10T00:00:00.000Z", now)).toBe("1y 2mo");
  });

  it("drops the months on a whole year", () => {
    expect(formatTenure("2025-11-20T00:00:00.000Z", now)).toBe("1y");
  });

  it("does not count a month that is not complete yet", () => {
    expect(formatTenure("2026-10-28T00:00:00.000Z", now)).toBe("New");
  });
});

describe("formatNotificationTime", () => {
  const now = new Date("2026-11-27T01:35:00.000Z"); // 12:35 PM, 27 Nov

  it("shows the time for today", () => {
    expect(formatNotificationTime("2026-11-26T22:41:00.000Z", now)).toBe(
      "9:41 AM",
    );
  });

  it("says Yesterday for the previous Melbourne day", () => {
    expect(formatNotificationTime("2026-11-26T01:00:00.000Z", now)).toBe(
      "Yesterday",
    );
  });

  it("counts the Melbourne day, not the UTC one", () => {
    // 00:10 on the 27th in Melbourne is still the 26th in UTC: it is today.
    expect(formatNotificationTime("2026-11-26T13:10:00.000Z", now)).toBe(
      "12:10 AM",
    );
  });

  it("shows day and month for older ones", () => {
    expect(formatNotificationTime("2026-11-12T03:00:00.000Z", now)).toBe(
      "12 Nov",
    );
  });
});
