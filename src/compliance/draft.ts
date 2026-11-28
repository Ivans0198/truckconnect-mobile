import type { components } from "@/api/schema";

import type { DocType } from "./types";

export type AllowedMimeType =
  components["schemas"]["RequestUploadUrlDto"]["mimeType"];

export const ALLOWED_MIME_TYPES: readonly AllowedMimeType[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

// El selector devuelve el tipo que le da el sistema, sea cual sea: validateDraft
// es quien lo rechaza antes de pedir la URL.
export type PickedFile = { uri: string; name: string; mimeType: string };

// El back exige el vehículo en estos dos tipos y lo rechaza en los demás casos
// con un 400 si falta (el openapi lo marca opcional, pero no es cierto).
export const VEHICLE_DOC_TYPES: readonly DocType[] = [
  "VEHICLE_REGO",
  "TRAILER_REGO",
];

export function needsVehicle(docType: DocType | null): boolean {
  return docType !== null && VEHICLE_DOC_TYPES.includes(docType);
}

export type DocumentDraft = {
  docType: DocType | null;
  vehicleId: string | null;
  // YYYY-MM-DD
  issueDate: string | null;
  expiryDate: string | null;
  file: PickedFile | null;
};

export type DraftError =
  | "missing-type"
  | "missing-vehicle"
  | "missing-file"
  | "missing-issue-date"
  | "missing-expiry-date"
  | "expiry-not-after-issue"
  | "unsupported-file";

// Las fechas son YYYY-MM-DD: comparadas como texto, el orden es el del calendario.
export function validateDraft(draft: DocumentDraft): DraftError[] {
  const errors: DraftError[] = [];
  if (!draft.docType) errors.push("missing-type");
  if (needsVehicle(draft.docType) && !draft.vehicleId) {
    errors.push("missing-vehicle");
  }
  if (!draft.file) errors.push("missing-file");
  else if (!isAllowedMimeType(draft.file.mimeType)) {
    errors.push("unsupported-file");
  }
  if (!draft.issueDate) errors.push("missing-issue-date");
  if (!draft.expiryDate) errors.push("missing-expiry-date");
  if (
    draft.issueDate &&
    draft.expiryDate &&
    draft.expiryDate <= draft.issueDate
  ) {
    errors.push("expiry-not-after-issue");
  }
  return errors;
}

// Un borrador que ya pasó validateDraft: lo que hace falta para enviar.
export type Submission = {
  docType: DocType;
  vehicleId?: string;
  issueDate: string;
  expiryDate: string;
  file: { uri: string; name: string; mimeType: AllowedMimeType };
};

export function toSubmission(draft: DocumentDraft): Submission | null {
  const { docType, vehicleId, issueDate, expiryDate, file } = draft;
  if (validateDraft(draft).length > 0) return null;
  if (!docType || !issueDate || !expiryDate || !file) return null;
  if (!isAllowedMimeType(file.mimeType)) return null;
  return {
    docType,
    ...(needsVehicle(docType) && vehicleId ? { vehicleId } : {}),
    issueDate,
    expiryDate,
    file: { ...file, mimeType: file.mimeType },
  };
}
