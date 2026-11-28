import type { Attention, DocumentCard } from "./types";

// "32 days", "1 day", "Today": la etiqueta de un documento que vence pronto.
export function formatDaysLabel(days: number): string {
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export type ExpiryAttention = Exclude<
  Attention,
  { kind: "under-review" | "rejected" }
>;

// La atención que se ve en rojo o ámbar: la del documento mismo, o la del
// aprobado que sigue rigiendo mientras la renovación se revisa.
export function expiryAttentionOf(
  attention: Attention,
): ExpiryAttention | null {
  if (attention.kind === "under-review" || attention.kind === "rejected") {
    return attention.current ? expiryAttentionOf(attention.current) : null;
  }
  return attention;
}

// Rojo: vence en 7 días o menos, ya venció o fue rechazado.
export function isRedCard(card: DocumentCard): boolean {
  const kind = expiryAttentionOf(card.attention)?.kind;
  return (
    kind === "urgent" ||
    kind === "expired" ||
    card.attention.kind === "rejected"
  );
}
