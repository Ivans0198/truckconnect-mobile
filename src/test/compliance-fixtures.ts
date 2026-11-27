import type { components, operations } from "@/api/schema";
import { melbourneCalendarDate } from "@/format/time";

type ComplianceDocument =
  components["schemas"]["ComplianceDocumentResponseDto"];

const MS_PER_DAY = 86_400_000;

// Viernes 2026-11-27, 12:35 PM en Melbourne, igual que la fixture de fatiga.
export const COMPLIANCE_NOW = new Date("2026-11-27T01:35:00.000Z");

// Fecha de calendario de Melbourne `days` días después de COMPLIANCE_NOW.
export function calendarDateIn(days: number): string {
  const today = new Date(`${melbourneCalendarDate(COMPLIANCE_NOW)}T00:00:00Z`);
  return new Date(today.getTime() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function complianceDocument(
  overrides: Partial<ComplianceDocument> & Pick<ComplianceDocument, "id">,
): ComplianceDocument {
  return {
    docType: "DRIVER_LICENCE",
    status: "APPROVED",
    driverId: "driver-1",
    vehicleId: null,
    issueDate: "2024-01-10T00:00:00.000Z",
    expiryDate: `${calendarDateIn(400)}T00:00:00.000Z`,
    fileKey: `documents/${overrides.id}.pdf`,
    fileMimeType: "application/pdf",
    fileSizeBytes: 120_000,
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    downloadUrl: `https://files.test/${overrides.id}.pdf`,
    createdAt: "2025-01-10T00:00:00.000Z",
    updatedAt: "2025-01-10T00:00:00.000Z",
    ...overrides,
  };
}

// Un aprobado de `docType` que vence dentro de `days` días (negativo: ya venció).
export function approvedExpiringIn(
  id: string,
  docType: ComplianceDocument["docType"],
  days: number,
): ComplianceDocument {
  return complianceDocument({
    id,
    docType,
    expiryDate: `${calendarDateIn(days)}T00:00:00.000Z`,
  });
}

export const approvedIn61Days = approvedExpiringIn(
  "doc-61",
  "DRIVER_LICENCE",
  61,
);
export const approvedIn60Days = approvedExpiringIn(
  "doc-60",
  "VEHICLE_REGO",
  60,
);
export const approvedIn8Days = approvedExpiringIn(
  "doc-8",
  "PUBLIC_LIABILITY",
  8,
);
export const approvedIn7Days = approvedExpiringIn("doc-7", "TRAILER_REGO", 7);
export const approvedToday = approvedExpiringIn("doc-0", "DANGEROUS_GOODS", 0);

// El back todavía no lo pasó a EXPIRED, pero la fecha ya pasó.
export const approvedPastExpiry = approvedExpiringIn(
  "doc-past",
  "DRIVER_LICENCE",
  -3,
);

export const expiredDocument = complianceDocument({
  id: "doc-expired",
  docType: "VEHICLE_REGO",
  status: "EXPIRED",
  expiryDate: `${calendarDateIn(-30)}T00:00:00.000Z`,
});

// Renovación en revisión sobre un aprobado que vence en 5 días (rojo).
export const redApprovedPublicLiability = approvedExpiringIn(
  "doc-pl-approved",
  "PUBLIC_LIABILITY",
  5,
);
export const pendingRenewal = complianceDocument({
  id: "doc-pl-pending",
  docType: "PUBLIC_LIABILITY",
  status: "PENDING_REVIEW",
  expiryDate: `${calendarDateIn(730)}T00:00:00.000Z`,
  createdAt: "2026-11-26T00:00:00.000Z",
});

export const rejectedDocument = complianceDocument({
  id: "doc-rejected",
  docType: "TRAILER_REGO",
  status: "REJECTED",
  rejectionReason: "The photo is blurry. Upload a sharper one.",
  expiryDate: `${calendarDateIn(500)}T00:00:00.000Z`,
  createdAt: "2026-11-25T00:00:00.000Z",
});

// Dos versiones del mismo tipo: la vieja vence pronto, la nueva dura más.
export const olderLicenceVersion = complianceDocument({
  id: "doc-licence-old",
  docType: "DRIVER_LICENCE",
  expiryDate: `${calendarDateIn(20)}T00:00:00.000Z`,
  createdAt: "2024-11-01T00:00:00.000Z",
});
export const newerLicenceVersion = complianceDocument({
  id: "doc-licence-new",
  docType: "DRIVER_LICENCE",
  expiryDate: `${calendarDateIn(900)}T00:00:00.000Z`,
  createdAt: "2026-10-01T00:00:00.000Z",
});

export function documentsPage(
  items: ComplianceDocument[],
): operations["ComplianceController_findAll"]["responses"][200]["content"]["application/json"] {
  return { items, total: items.length, page: 1, limit: 100, totalPages: 1 };
}
