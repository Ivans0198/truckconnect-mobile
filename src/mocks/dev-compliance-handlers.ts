import type { components } from "@/api/schema";
import { melbourneCalendarDate } from "@/format/time";

import { driverAccountFixture } from "./auth-fixtures";
import type { DevRoute } from "./dev-auth-handlers";

type ComplianceDocument =
  components["schemas"]["ComplianceDocumentResponseDto"];
type CreateDocument = components["schemas"]["CreateComplianceDocumentDto"];
type RequestUploadUrl = components["schemas"]["RequestUploadUrlDto"];
type Vehicle = components["schemas"]["VehicleResponseDto"];
type ApiError = components["schemas"]["ApiErrorDto"];

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const MS_PER_DAY = 86_400_000;
// Lo que el back real da a una URL de subida (15 minutos).
const UPLOAD_URL_LIFETIME_SECONDS = 900;
const DEV_UPLOADS_PATH = "__dev-uploads";
const PAGE_LIMIT = 100;
const FAR_FUTURE_DAYS = 400;
// Un Public Liability que pide atención: el flow de Maestro lo renueva.
const PUBLIC_LIABILITY_DAYS_LEFT = 32;

const jsonResponse = (body: unknown, status = HTTP_OK): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const badRequest = (message: string): Response => {
  const body: ApiError = {
    statusCode: HTTP_BAD_REQUEST,
    message,
    error: "Bad Request",
  };
  return jsonResponse(body, HTTP_BAD_REQUEST);
};

const escapeForRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const page = <T>(items: T[]): unknown => ({
  items,
  total: items.length,
  page: 1,
  limit: PAGE_LIMIT,
  totalPages: 1,
});

const calendarDateIn = (now: Date, days: number): string =>
  melbourneCalendarDate(new Date(now.getTime() + days * MS_PER_DAY));

const asInstant = (calendarDate: string): string =>
  `${calendarDate}T00:00:00.000Z`;

function approvedDocument(
  now: Date,
  docType: ComplianceDocument["docType"],
  daysLeft: number,
): ComplianceDocument {
  const id = `dev-doc-${docType.toLowerCase()}`;
  return {
    id,
    docType,
    status: "APPROVED",
    driverId: driverAccountFixture.id,
    vehicleId: null,
    issueDate: asInstant(calendarDateIn(now, daysLeft - FAR_FUTURE_DAYS)),
    expiryDate: asInstant(calendarDateIn(now, daysLeft)),
    fileKey: `documents/${id}.pdf`,
    fileMimeType: "application/pdf",
    fileSizeBytes: 120_000,
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    downloadUrl: `https://files.invalid/${id}.pdf`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

const devVehicle = (now: Date): Vehicle => ({
  id: "dev-vehicle-1",
  driverId: driverAccountFixture.id,
  type: "RIGID",
  registrationNumber: "1AB-2CD",
  state: "VIC",
  make: "Isuzu",
  model: "FRR 110-260",
  year: 2021,
  gvmKg: 11_000,
  maxPayloadKg: 6_000,
  palletCapacity: 10,
  cargoLengthM: 6.5,
  cargoWidthM: 2.4,
  cargoHeightM: 2.4,
  hasTailLift: true,
  isActive: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function isCreateDocument(
  body: Record<string, unknown>,
): body is CreateDocument {
  return (
    hasText(body.docType) &&
    hasText(body.issueDate) &&
    hasText(body.expiryDate) &&
    hasText(body.fileKey) &&
    hasText(body.fileMimeType) &&
    typeof body.fileSizeBytes === "number"
  );
}

function isRequestUploadUrl(
  body: Record<string, unknown>,
): body is RequestUploadUrl {
  return (
    hasText(body.docType) &&
    hasText(body.mimeType) &&
    typeof body.fileSizeBytes === "number"
  );
}

const EXTENSION_BY_MIME_TYPE: Record<RequestUploadUrl["mimeType"], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Los documentos viven en memoria mientras la app está abierta: matar la app
// los devuelve al estado de partida. Nunca llega a un build de producción
// (index.js carga estos mocks solo en desarrollo y sin EXPO_PUBLIC_API_URL).
export function createDevComplianceRoutes(
  baseUrl: string,
  now: () => Date,
): DevRoute[] {
  const documents: ComplianceDocument[] = [
    approvedDocument(now(), "DRIVER_LICENCE", FAR_FUTURE_DAYS),
    approvedDocument(now(), "PUBLIC_LIABILITY", PUBLIC_LIABILITY_DAYS_LEFT),
  ];
  let uploadsIssued = 0;
  let documentsRegistered = 0;

  async function issueUploadUrl(request: Request): Promise<Response> {
    const body = await readJsonObject(request);
    if (!isRequestUploadUrl(body)) {
      return badRequest("docType, mimeType and fileSizeBytes are required");
    }
    uploadsIssued += 1;
    const fileKey = `documents/dev-upload-${uploadsIssued}.${EXTENSION_BY_MIME_TYPE[body.mimeType]}`;
    return jsonResponse(
      {
        uploadUrl: `${baseUrl}/${DEV_UPLOADS_PATH}/${fileKey}`,
        fileKey,
        expiresInSeconds: UPLOAD_URL_LIFETIME_SECONDS,
      },
      HTTP_CREATED,
    );
  }

  async function registerDocument(request: Request): Promise<Response> {
    const body = await readJsonObject(request);
    if (!isCreateDocument(body)) {
      return badRequest(
        "docType, issueDate, expiryDate, fileKey, fileMimeType and fileSizeBytes are required",
      );
    }
    if (
      (body.docType === "VEHICLE_REGO" || body.docType === "TRAILER_REGO") &&
      !hasText(body.vehicleId)
    ) {
      // Igual que el back real: el openapi lo marca opcional, pero lo exige.
      return badRequest(`vehicleId is required for ${body.docType}`);
    }
    documentsRegistered += 1;
    const created: ComplianceDocument = {
      ...approvedDocument(now(), body.docType, 0),
      id: `dev-registered-${documentsRegistered}`,
      status: "PENDING_REVIEW",
      vehicleId: body.vehicleId ?? null,
      issueDate: asInstant(body.issueDate),
      expiryDate: asInstant(body.expiryDate),
      fileKey: body.fileKey,
      fileMimeType: body.fileMimeType,
      fileSizeBytes: body.fileSizeBytes,
    };
    documents.push(created);
    return jsonResponse(created, HTTP_CREATED);
  }

  const escapedBase = escapeForRegExp(baseUrl);
  return [
    {
      method: "GET",
      url: `${baseUrl}/compliance/documents`,
      handle: () => jsonResponse(page(documents)),
    },
    {
      method: "POST",
      url: `${baseUrl}/compliance/documents/upload-url`,
      handle: issueUploadUrl,
    },
    {
      method: "PUT",
      url: new RegExp(`^${escapedBase}/${DEV_UPLOADS_PATH}/.+`),
      handle: () => new Response(null, { status: HTTP_OK }),
    },
    {
      method: "POST",
      url: `${baseUrl}/compliance/documents`,
      handle: registerDocument,
    },
    {
      method: "GET",
      url: new RegExp(`^${escapedBase}/drivers/[^/]+/stats$`),
      handle: () =>
        jsonResponse({
          period: "month",
          hoursWorked: 0,
          totalEarningsCents: 0,
          totalOrders: 0,
          avgMargin: 0,
        }),
    },
    {
      method: "GET",
      url: `${baseUrl}/vehicles`,
      handle: () => jsonResponse(page([devVehicle(now())])),
    },
    {
      method: "GET",
      url: `${baseUrl}/notifications`,
      handle: () => jsonResponse(page([])),
    },
  ];
}
