import { summarizeDocuments } from "@/compliance/attention";
import { formatDaysLabel } from "@/compliance/expiry-text";
import { useComplianceDocuments } from "@/compliance/queries";
import {
  DOC_TYPE_NAMES,
  DOC_TYPES,
  type ComplianceBlockReason,
  type DocumentCard,
} from "@/compliance/types";

import { useFatigueStatus, useWeekSummary } from "./queries";
import { nextBreakFor } from "./next-break";
import type { FatigueStatus, WeekSummary } from "./types";
import { useNow } from "./use-now";

export type AcceptanceBlockReason =
  | { kind: "daily-limit" }
  | { kind: "weekly-limit" }
  | { kind: "break-overdue" }
  | ComplianceBlockReason;

export type OrderAcceptance =
  | { kind: "allowed" }
  | { kind: "blocked"; reasons: AcceptanceBlockReason[] }
  | { kind: "unknown" };

export function describeBlockReason(reason: AcceptanceBlockReason): string {
  switch (reason.kind) {
    case "daily-limit":
      return "Daily limit reached";
    case "weekly-limit":
      return "Weekly limit reached";
    case "break-overdue":
      return "Break overdue";
    case "compliance": {
      const name = DOC_TYPE_NAMES[reason.docType];
      switch (reason.state) {
        case "expired":
          return `${name} expired`;
        case "under-review":
          return `${name} under review`;
        case "expiring":
          return reason.days === 0 || reason.days === null
            ? `${name} expires today`
            : `${name} expires in ${formatDaysLabel(reason.days)}`;
      }
    }
  }
}

type EvaluationInput = {
  status: FatigueStatus;
  week: WeekSummary;
  // undefined: los documentos no cargaron y no suman motivos.
  compliance: DocumentCard[] | undefined;
  now: Date;
};

function complianceReasons(
  cards: DocumentCard[] | undefined,
): ComplianceBlockReason[] {
  if (!cards) return [];
  const reasons = cards.flatMap((card) =>
    card.blocksAcceptance ? [card.blocksAcceptance] : [],
  );
  return reasons.sort(
    (first, second) =>
      DOC_TYPES.indexOf(first.docType) - DOC_TYPES.indexOf(second.docType),
  );
}

// Los límites los calcula el back; aquí solo se comparan con cero y con `now`.
export function evaluateOrderAcceptance({
  status,
  week,
  compliance,
  now,
}: EvaluationInput): Exclude<OrderAcceptance, { kind: "unknown" }> {
  const reasons: AcceptanceBlockReason[] = [];
  if (status.hoursRemaining <= 0) reasons.push({ kind: "daily-limit" });
  if (week.remainingHours <= 0) reasons.push({ kind: "weekly-limit" });
  if (nextBreakFor(status, now).kind === "due") {
    reasons.push({ kind: "break-overdue" });
  }
  reasons.push(...complianceReasons(compliance));
  return reasons.length > 0
    ? { kind: "blocked", reasons }
    : { kind: "allowed" };
}

// Comparte las queries (y su refresco) con la pantalla de fatiga. Si un
// refresco falla, queda el último dato conocido: solo es "unknown" sin dato.
export function useOrderAcceptance(): OrderAcceptance {
  const status = useFatigueStatus();
  const week = useWeekSummary();
  const documents = useComplianceDocuments();
  const now = useNow();
  if (!status.data || !week.data) return { kind: "unknown" };
  return evaluateOrderAcceptance({
    status: status.data,
    week: week.data,
    compliance: documents.data
      ? summarizeDocuments(documents.data, now).cards
      : undefined,
    now,
  });
}
