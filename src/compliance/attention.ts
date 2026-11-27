import { melbourneDaysUntil } from "@/format/time";

import {
  ATTENTION_FROM_DAYS,
  DOC_TYPES,
  URGENT_FROM_DAYS,
  type Attention,
  type ComplianceBlockReason,
  type ComplianceDocument,
  type ComplianceSummary,
  type DocumentCard,
} from "./types";

function byCreatedAtDescending(
  first: ComplianceDocument,
  second: ComplianceDocument,
): number {
  return second.createdAt.localeCompare(first.createdAt);
}

function attentionByDays(days: number): Attention {
  if (days < 0) return { kind: "expired" };
  if (days <= URGENT_FROM_DAYS) return { kind: "urgent", days };
  if (days <= ATTENTION_FROM_DAYS) return { kind: "expiring", days };
  return { kind: "valid", days };
}

// Atención de un documento ya resuelto (APPROVED o EXPIRED).
function attentionOfCurrent(
  document: ComplianceDocument,
  now: Date,
): Attention {
  if (document.status === "EXPIRED") return { kind: "expired" };
  return attentionByDays(melbourneDaysUntil(document.expiryDate, now));
}

function attentionOf(
  latest: ComplianceDocument,
  current: ComplianceDocument | undefined,
  now: Date,
): Attention {
  const currentAttention = current ? attentionOfCurrent(current, now) : null;
  switch (latest.status) {
    case "APPROVED":
    case "EXPIRED":
      return attentionOfCurrent(latest, now);
    case "PENDING_REVIEW":
      return { kind: "under-review", current: currentAttention };
    case "REJECTED":
      return {
        kind: "rejected",
        reason: latest.rejectionReason,
        current: currentAttention,
      };
  }
}

function isRed(attention: Attention | null): boolean {
  return attention?.kind === "urgent" || attention?.kind === "expired";
}

function needsAttention(attention: Attention): boolean {
  switch (attention.kind) {
    case "valid":
      return false;
    case "expiring":
    case "urgent":
    case "expired":
    case "rejected":
      return true;
    case "under-review":
      return isRed(attention.current);
  }
}

function blockReasonOf(
  docType: DocumentCard["docType"],
  attention: Attention,
): ComplianceBlockReason | null {
  switch (attention.kind) {
    case "urgent":
      return {
        kind: "compliance",
        docType,
        state: "expiring",
        days: attention.days,
      };
    case "expired":
      return { kind: "compliance", docType, state: "expired", days: null };
    case "under-review":
      return isRed(attention.current)
        ? { kind: "compliance", docType, state: "under-review", days: null }
        : null;
    case "rejected":
      return attention.current && isRed(attention.current)
        ? blockReasonOf(docType, attention.current)
        : null;
    case "valid":
    case "expiring":
      return null;
  }
}

function buildCard(
  docType: DocumentCard["docType"],
  versions: ComplianceDocument[],
  now: Date,
): DocumentCard {
  const [latest, ...older] = [...versions].sort(byCreatedAtDescending);
  if (!latest) throw new Error(`No documents for ${docType}`);
  const current = [latest, ...older].find(
    (document) =>
      document.status === "APPROVED" || document.status === "EXPIRED",
  );
  const attention = attentionOf(latest, current, now);
  return {
    docType,
    latest,
    current: current ?? null,
    attention,
    needsAttention: needsAttention(attention),
    blocksAcceptance: blockReasonOf(docType, attention),
  };
}

// Orden de urgencia: vencido primero, después menos días. Lo que no tiene
// días (un rechazado sin aprobado vigente) va al final.
function urgencyRank(attention: Attention): number {
  switch (attention.kind) {
    case "expired":
      return Number.NEGATIVE_INFINITY;
    case "valid":
    case "expiring":
    case "urgent":
      return attention.days;
    case "under-review":
    case "rejected":
      return attention.current
        ? urgencyRank(attention.current)
        : Number.POSITIVE_INFINITY;
  }
}

function mostUrgentOf(cards: DocumentCard[]): DocumentCard | null {
  let best: DocumentCard | null = null;
  for (const card of cards) {
    if (!card.needsAttention) continue;
    if (!best || urgencyRank(card.attention) < urgencyRank(best.attention)) {
      best = card;
    }
  }
  return best;
}

export function summarizeDocuments(
  documents: ComplianceDocument[],
  now: Date,
): ComplianceSummary {
  const cards = DOC_TYPES.flatMap((docType) => {
    const versions = documents.filter(
      (document) => document.docType === docType,
    );
    return versions.length === 0 ? [] : [buildCard(docType, versions, now)];
  });
  return {
    cards,
    attentionCount: cards.filter((card) => card.needsAttention).length,
    mostUrgent: mostUrgentOf(cards),
  };
}
