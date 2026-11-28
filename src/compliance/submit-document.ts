import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import { api } from "@/api/client";
import type { components } from "@/api/schema";
import {
  UploadError,
  isUploadError,
  uploadWithPresignedUrl,
  type UploadStage,
  type UploadTarget,
} from "@/uploads/presigned-upload";

import type { Submission } from "./draft";
import { COMPLIANCE_DOCUMENTS_KEY } from "./queries";

type ApiErrorBody = components["schemas"]["ApiErrorDto"];

const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;

export const RATE_LIMITED_MESSAGE = "Too many requests. Try again shortly.";
const REJECTED_FALLBACK = "The document couldn't be uploaded.";
const OFFLINE_MESSAGE =
  "The document was not uploaded. Check your connection and try again.";
const SERVER_MESSAGE = "The document was not uploaded. Try again.";

function messageOf(body: ApiErrorBody | undefined): string {
  const message = body?.message;
  if (!message || message.length === 0) return REJECTED_FALLBACK;
  return Array.isArray(message) ? message.join(". ") : message;
}

// Un no-2xx del back: 429 es "más tarde", 400 trae su mensaje, el resto es
// del servidor.
function failureOfResponse(
  stage: UploadStage,
  status: number,
  body: ApiErrorBody | undefined,
): UploadError {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return new UploadError({ stage, kind: "rate-limited" });
  }
  if (status === HTTP_BAD_REQUEST) {
    return new UploadError({
      stage,
      kind: "rejected",
      message: messageOf(body),
    });
  }
  return new UploadError({ stage, kind: "server" });
}

async function requestUploadTarget(
  submission: Submission,
  fileSizeBytes: number,
): Promise<UploadTarget> {
  const { data, error, response } = await api.POST(
    "/compliance/documents/upload-url",
    {
      body: {
        docType: submission.docType,
        mimeType: submission.file.mimeType,
        fileSizeBytes,
      },
    },
  );
  if (!data) throw failureOfResponse("request-url", response.status, error);
  return data;
}

async function registerDocument(
  submission: Submission,
  upload: { fileKey: string; fileSizeBytes: number },
): Promise<void> {
  const result = await api
    .POST("/compliance/documents", {
      body: {
        docType: submission.docType,
        ...(submission.vehicleId ? { vehicleId: submission.vehicleId } : {}),
        issueDate: submission.issueDate,
        expiryDate: submission.expiryDate,
        fileKey: upload.fileKey,
        fileMimeType: submission.file.mimeType,
        fileSizeBytes: upload.fileSizeBytes,
      },
    })
    .catch(() => {
      throw new UploadError({ stage: "register", kind: "offline" });
    });
  if (!result.data) {
    throw failureOfResponse("register", result.response.status, result.error);
  }
}

// Los tres pasos de contracts/uploads.md. Sin cola: la subida sin conexión
// queda fuera de E5 (FR-011), así que un fallo vuelve al conductor.
export async function submitDocument(submission: Submission): Promise<void> {
  const upload = await uploadWithPresignedUrl({
    file: { uri: submission.file.uri, mimeType: submission.file.mimeType },
    requestUrl: (fileSizeBytes) =>
      requestUploadTarget(submission, fileSizeBytes),
  });
  await registerDocument(submission, upload);
}

// Lo que se le dice al conductor de cada fallo.
export function submitFailureMessage(error: unknown): string {
  if (!isUploadError(error)) return SERVER_MESSAGE;
  switch (error.kind) {
    case "rate-limited":
      return RATE_LIMITED_MESSAGE;
    case "offline":
      return OFFLINE_MESSAGE;
    case "rejected":
      // El rechazo del PUT (dos 403 seguidos) no trae texto del back.
      return error.stage === "put" ? REJECTED_FALLBACK : error.message;
    case "server":
      return SERVER_MESSAGE;
  }
}

export function useSubmitDocument(): UseMutationResult<
  void,
  Error,
  Submission
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitDocument,
    retry: 0,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_DOCUMENTS_KEY }),
  });
}
