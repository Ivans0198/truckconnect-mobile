import { fatigueStatusFixture } from "@/test/fatigue-fixtures";

import { nextBreakFor } from "./next-break";

const NOW = new Date("2026-11-27T01:35:00.000Z");
const MS_PER_MINUTE = 60_000;

describe("nextBreakFor", () => {
  it("counts down to a future break while working", () => {
    const status = {
      ...fatigueStatusFixture,
      state: "working" as const,
      nextBreakDueAt: "2026-11-27T03:47:00.000Z",
    };

    expect(nextBreakFor(status, NOW)).toEqual({
      kind: "in",
      ms: 132 * MS_PER_MINUTE,
    });
  });

  it("is due when the break time is exactly now", () => {
    const status = {
      ...fatigueStatusFixture,
      nextBreakDueAt: NOW.toISOString(),
    };

    expect(nextBreakFor(status, NOW)).toEqual({ kind: "due" });
  });

  it("is due when the break time already passed", () => {
    const status = {
      ...fatigueStatusFixture,
      nextBreakDueAt: "2026-11-27T00:00:00.000Z",
    };

    expect(nextBreakFor(status, NOW)).toEqual({ kind: "due" });
  });

  it.each(["on_break", "off_duty"] as const)(
    "has no countdown while %s",
    (state) => {
      const status = {
        ...fatigueStatusFixture,
        state,
        nextBreakDueAt: "2026-11-27T03:47:00.000Z",
      };

      expect(nextBreakFor(status, NOW)).toEqual({ kind: "none" });
    },
  );

  it("has no countdown when the back sends no break time", () => {
    const status = { ...fatigueStatusFixture, nextBreakDueAt: null };

    expect(nextBreakFor(status, NOW)).toEqual({ kind: "none" });
  });
});
