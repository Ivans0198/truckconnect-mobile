import {
  fatigueEventsFixture,
  fatigueStatusFixture,
} from "@/test/fatigue-fixtures";

import { buildTimeline } from "./timeline";
import type { FatigueEvent } from "./types";

const MS_PER_MINUTE = 60_000;

function eventAt(
  id: string,
  eventType: FatigueEvent["eventType"],
  timestamp: string,
): FatigueEvent {
  return { id, eventType, driverId: "driver-1", timestamp };
}

describe("buildTimeline", () => {
  it("names the four event types", () => {
    const events = [
      eventAt("a", "DAY_START", "2026-11-26T19:00:00.000Z"),
      eventAt("b", "BREAK_START", "2026-11-26T20:00:00.000Z"),
      eventAt("c", "BREAK_END", "2026-11-26T20:15:00.000Z"),
      eventAt("d", "DAY_END", "2026-11-27T05:00:00.000Z"),
    ];

    const labels = buildTimeline(events, fatigueStatusFixture).map(
      (entry) => entry.label,
    );

    expect(labels).toEqual([
      "Day started",
      "Break started",
      "Back to work",
      "Day ended",
    ]);
  });

  it("sorts by timestamp even when the back sends them shuffled", () => {
    const shuffled = [...fatigueEventsFixture].reverse();

    const ids = buildTimeline(shuffled, fatigueStatusFixture).map(
      (entry) => entry.id,
    );

    expect(ids).toEqual(["e1", "e2", "e3", "e4", "e5"]);
  });

  it("does not mutate the list it receives", () => {
    const shuffled = [...fatigueEventsFixture].reverse();
    const before = shuffled.map((event) => event.id);

    buildTimeline(shuffled, fatigueStatusFixture);

    expect(shuffled.map((event) => event.id)).toEqual(before);
  });

  it("gives a finished break its length", () => {
    const [, breakStart] = buildTimeline(
      fatigueEventsFixture,
      fatigueStatusFixture,
    );

    expect(breakStart?.durationMs).toBe(15 * MS_PER_MINUTE);
  });

  it("gives no length to a break that has not ended", () => {
    const events = [
      eventAt("a", "DAY_START", "2026-11-26T19:00:00.000Z"),
      eventAt("b", "BREAK_START", "2026-11-26T20:00:00.000Z"),
    ];

    const entries = buildTimeline(events, {
      ...fatigueStatusFixture,
      state: "on_break",
    });

    expect(entries[1]?.durationMs).toBeUndefined();
  });

  it("gives no length to events that are not a break start", () => {
    const entries = buildTimeline(fatigueEventsFixture, fatigueStatusFixture);

    expect(entries[0]?.durationMs).toBeUndefined();
    expect(entries[2]?.durationMs).toBeUndefined();
  });

  it("marks only the last event as current while the day is on", () => {
    const entries = buildTimeline(fatigueEventsFixture, fatigueStatusFixture);

    expect(entries.map((entry) => entry.isCurrent)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it("marks nothing as current once the day is off duty", () => {
    const entries = buildTimeline(fatigueEventsFixture, {
      ...fatigueStatusFixture,
      state: "off_duty",
    });

    expect(entries.some((entry) => entry.isCurrent)).toBe(false);
  });

  it("returns an empty list for no events", () => {
    expect(buildTimeline([], fatigueStatusFixture)).toEqual([]);
  });
});
