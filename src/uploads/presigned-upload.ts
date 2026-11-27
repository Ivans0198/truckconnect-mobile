import { readFile } from "./read-file";

export type UploadStage = "request-url" | "put" | "register";
export type UploadErrorKind =
  "offline" | "rejected" | "server" | "rate-limited";

export type UploadTarget = {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
};

export type FileToUpload = { uri: string; mimeType: string };

export class UploadError extends Error {
  readonly stage: UploadStage;
  readonly kind: UploadErrorKind;

  constructor(options: {
    stage: UploadStage;
    kind: UploadErrorKind;
    message?: string;
  }) {
    super(
      options.message ?? `Upload failed at ${options.stage}: ${options.kind}`,
    );
    this.name = "UploadError";
    this.stage = options.stage;
    this.kind = options.kind;
  }
}

export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError;
}

const MS_PER_SECOND = 1000;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;

// Un fallo al pedir la URL: sin red es un TypeError de fetch; el resto es del
// back. El dominio puede lanzar su propio UploadError (por ejemplo un 429).
function requestUrlFailure(error: unknown): UploadError {
  if (isUploadError(error)) return error;
  return new UploadError({
    stage: "request-url",
    kind: error instanceof TypeError ? "offline" : "server",
    message: error instanceof Error ? error.message : undefined,
  });
}

async function requestTarget(
  requestUrl: (fileSizeBytes: number) => Promise<UploadTarget>,
  fileSizeBytes: number,
): Promise<UploadTarget> {
  try {
    return await requestUrl(fileSizeBytes);
  } catch (error) {
    throw requestUrlFailure(error);
  }
}

function failureOfStatus(status: number): UploadError {
  return new UploadError({
    stage: "put",
    kind: status === HTTP_TOO_MANY_REQUESTS ? "rate-limited" : "server",
    message: `The upload answered ${status}`,
  });
}

async function put(
  uploadUrl: string,
  file: FileToUpload,
  body: Blob,
): Promise<number> {
  try {
    // Sin Authorization: la URL firmada ya trae la autorización y R2 rechaza
    // un encabezado extra.
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.mimeType },
      body,
    });
    return response.status;
  } catch {
    throw new UploadError({ stage: "put", kind: "offline" });
  }
}

export async function uploadWithPresignedUrl(input: {
  file: FileToUpload;
  requestUrl: (fileSizeBytes: number) => Promise<UploadTarget>;
  now?: () => number;
}): Promise<{ fileKey: string; fileSizeBytes: number }> {
  const { file, requestUrl, now = Date.now } = input;
  const { body, sizeBytes } = await readFile(file.uri);

  // Una sola renovación por subida, venga del vencimiento o de un 403.
  let hasRenewed = false;
  for (;;) {
    // Se mide desde antes de pedirla: una pedida lenta también gasta vigencia.
    const requestedAt = now();
    const target = await requestTarget(requestUrl, sizeBytes);
    const hasExpired =
      now() - requestedAt >= target.expiresInSeconds * MS_PER_SECOND;
    if (hasExpired && !hasRenewed) {
      hasRenewed = true;
      continue;
    }
    const status = await put(target.uploadUrl, file, body);
    if (status >= 200 && status < 300) {
      return { fileKey: target.fileKey, fileSizeBytes: sizeBytes };
    }
    if (status !== HTTP_FORBIDDEN) throw failureOfStatus(status);
    if (hasRenewed) {
      throw new UploadError({
        stage: "put",
        kind: "rejected",
        message: "The upload was rejected twice",
      });
    }
    hasRenewed = true;
  }
}
