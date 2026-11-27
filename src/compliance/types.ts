import type { components } from "@/api/schema";

export type ComplianceDocument =
  components["schemas"]["ComplianceDocumentResponseDto"];
export type DocType = components["schemas"]["DocType"];
export type DocStatus = components["schemas"]["DocStatus"];

// Orden fijo de las tarjetas: el del contrato.
export const DOC_TYPES: readonly DocType[] = [
  "DRIVER_LICENCE",
  "VEHICLE_REGO",
  "PUBLIC_LIABILITY",
  "TRAILER_REGO",
  "DANGEROUS_GOODS",
];

export const DOC_TYPE_NAMES: Record<DocType, string> = {
  DRIVER_LICENCE: "Driver Licence",
  VEHICLE_REGO: "Vehicle Registration",
  PUBLIC_LIABILITY: "Public Liability",
  TRAILER_REGO: "Trailer Registration",
  DANGEROUS_GOODS: "Dangerous Goods",
};

// Desde cuántos días antes del vencimiento el documento pide atención.
export const ATTENTION_FROM_DAYS = 60;
// Desde cuántos días antes el aviso pasa a rojo y la orden se bloquea.
export const URGENT_FROM_DAYS = 7;

export type Attention =
  | { kind: "valid"; days: number }
  | { kind: "expiring"; days: number }
  | { kind: "urgent"; days: number }
  | { kind: "expired" }
  | { kind: "under-review"; current: Attention | null }
  | { kind: "rejected"; reason: string | null; current: Attention | null };

export type ComplianceBlockReason = {
  kind: "compliance";
  docType: DocType;
  state: "expiring" | "expired" | "under-review";
  days: number | null;
};

export type DocumentCard = {
  docType: DocType;
  latest: ComplianceDocument;
  attention: Attention;
  needsAttention: boolean;
  blocksAcceptance: ComplianceBlockReason | null;
};

export type ComplianceSummary = {
  cards: DocumentCard[];
  attentionCount: number;
  mostUrgent: DocumentCard | null;
};
