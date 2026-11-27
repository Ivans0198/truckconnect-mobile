import { useFatigueStatus, useWeekSummary } from "./queries";
import { nextBreakFor } from "./next-break";
import type { FatigueStatus, WeekSummary } from "./types";
import { useNow } from "./use-now";

export type AcceptanceBlockReason =
  "daily-limit" | "weekly-limit" | "break-overdue";

export type OrderAcceptance =
  | { kind: "allowed" }
  | { kind: "blocked"; reasons: AcceptanceBlockReason[] }
  | { kind: "unknown" };

export const ACCEPTANCE_BLOCK_MESSAGES: Record<AcceptanceBlockReason, string> =
  {
    "daily-limit": "Daily limit reached",
    "weekly-limit": "Weekly limit reached",
    "break-overdue": "Break overdue",
  };

type EvaluationInput = {
  status: FatigueStatus;
  week: WeekSummary;
  now: Date;
};

// Los límites los calcula el back; aquí solo se comparan con cero y con `now`.
export function evaluateOrderAcceptance({
  status,
  week,
  now,
}: EvaluationInput): Exclude<OrderAcceptance, { kind: "unknown" }> {
  const reasons: AcceptanceBlockReason[] = [];
  if (status.hoursRemaining <= 0) reasons.push("daily-limit");
  if (week.remainingHours <= 0) reasons.push("weekly-limit");
  if (nextBreakFor(status, now).kind === "due") reasons.push("break-overdue");
  return reasons.length > 0
    ? { kind: "blocked", reasons }
    : { kind: "allowed" };
}

// Comparte las queries (y su refresco) con la pantalla de fatiga. Si un
// refresco falla, queda el último dato conocido: solo es "unknown" sin dato.
export function useOrderAcceptance(): OrderAcceptance {
  const status = useFatigueStatus();
  const week = useWeekSummary();
  const now = useNow();
  if (!status.data || !week.data) return { kind: "unknown" };
  return evaluateOrderAcceptance({
    status: status.data,
    week: week.data,
    now,
  });
}
