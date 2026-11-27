import type { FatigueEvent, FatigueEventType, FatigueStatus } from "./types";

export type TimelineEntry = {
  id: string;
  type: FatigueEventType;
  label: string;
  at: string;
  durationMs?: number;
  isCurrent: boolean;
};

const LABELS: Record<FatigueEventType, string> = {
  DAY_START: "Day started",
  BREAK_START: "Break started",
  BREAK_END: "Back to work",
  DAY_END: "Day ended",
};

function byTimestamp(a: FatigueEvent, b: FatigueEvent): number {
  return Date.parse(a.timestamp) - Date.parse(b.timestamp);
}

// El back puede mandar los eventos en cualquier orden; el conductor los lee
// del más viejo al más nuevo. Un break dura hasta el evento que le sigue,
// siempre que ese sea su BREAK_END.
export function buildTimeline(
  events: readonly FatigueEvent[],
  status: FatigueStatus,
): TimelineEntry[] {
  const sorted = [...events].sort(byTimestamp);
  const lastIndex = sorted.length - 1;
  const isDayOn = status.state !== "off_duty";

  return sorted.map((event, index) => {
    const next = sorted[index + 1];
    const endsBreak =
      event.eventType === "BREAK_START" && next?.eventType === "BREAK_END";
    return {
      id: event.id,
      type: event.eventType,
      label: LABELS[event.eventType],
      at: event.timestamp,
      ...(endsBreak
        ? {
            durationMs:
              Date.parse(next.timestamp) - Date.parse(event.timestamp),
          }
        : {}),
      isCurrent: isDayOn && index === lastIndex,
    };
  });
}
