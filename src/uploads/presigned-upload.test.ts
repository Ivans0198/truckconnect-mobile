import { http, HttpResponse } from "msw";

import { server } from "@/test/server";

import {
  UploadError,
  isUploadError,
  uploadWithPresignedUrl,
} from "./presigned-upload";

jest.mock("./read-file", () => ({
  readFile: jest.fn(async () => ({
    body: new Blob(["pdf-bytes"], { type: "application/pdf" }),
    sizeBytes: 9,
  })),
}));

const UPLOAD_URL = "https://uploads.test/documents/doc-1.pdf";
const EXPIRES_IN_SECONDS = 900;
const FILE = { uri: "file:///tmp/licence.pdf", mimeType: "application/pdf" };

function target(fileKey = "documents/doc-1.pdf") {
  return {
    uploadUrl: UPLOAD_URL,
    fileKey,
    expiresInSeconds: EXPIRES_IN_SECONDS,
  };
}

function putReturning(status: number) {
  return http.put(UPLOAD_URL, () => new HttpResponse(null, { status }));
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("The upload was expected to fail");
}

describe("uploadWithPresignedUrl", () => {
  it("asks for the URL with the file size, PUTs without Authorization and returns the key and size", async () => {
    let putHeaders: Headers | undefined;
    server.use(
      http.put(UPLOAD_URL, ({ request }) => {
        putHeaders = request.headers;
        return new HttpResponse(null, { status: 200 });
      }),
    );
    const requestUrl = jest.fn(async () => target());

    const result = await uploadWithPresignedUrl({ file: FILE, requestUrl });

    expect(requestUrl).toHaveBeenCalledWith(9);
    expect(putHeaders?.get("authorization")).toBeNull();
    expect(putHeaders?.get("content-type")).toBe("application/pdf");
    expect(result).toEqual({
      fileKey: "documents/doc-1.pdf",
      fileSizeBytes: 9,
    });
  });

  it("asks for a new URL once when the first one expired before the PUT", async () => {
    server.use(putReturning(200));
    const requestUrl = jest
      .fn()
      .mockResolvedValueOnce(target("documents/stale.pdf"))
      .mockResolvedValueOnce(target("documents/fresh.pdf"));
    // 1) pedida la URL vieja, 2) justo antes del PUT ya venció, 3) pedida la
    // nueva, 4) justo antes del PUT sigue vigente.
    const clock = [0, EXPIRES_IN_SECONDS * 1000 + 1, 0, 1];
    const now = jest.fn(() => clock.shift() ?? 0);

    const result = await uploadWithPresignedUrl({
      file: FILE,
      requestUrl,
      now,
    });

    expect(requestUrl).toHaveBeenCalledTimes(2);
    expect(result.fileKey).toBe("documents/fresh.pdf");
  });

  it("asks for a new URL once after a 403 on the PUT", async () => {
    let puts = 0;
    server.use(
      http.put(UPLOAD_URL, () => {
        puts += 1;
        return new HttpResponse(null, { status: puts === 1 ? 403 : 200 });
      }),
    );
    const requestUrl = jest.fn(async () => target());

    await expect(
      uploadWithPresignedUrl({ file: FILE, requestUrl }),
    ).resolves.toMatchObject({ fileKey: "documents/doc-1.pdf" });

    expect(requestUrl).toHaveBeenCalledTimes(2);
  });

  it("is rejected at the put stage on a second 403", async () => {
    server.use(putReturning(403));
    const requestUrl = jest.fn(async () => target());

    const error = await failureOf(
      uploadWithPresignedUrl({ file: FILE, requestUrl }),
    );

    expect(isUploadError(error)).toBe(true);
    expect(error).toMatchObject({ stage: "put", kind: "rejected" });
    expect(requestUrl).toHaveBeenCalledTimes(2);
  });

  it("fails with offline at the put stage when there is no network", async () => {
    server.use(http.put(UPLOAD_URL, () => HttpResponse.error()));

    const error = await failureOf(
      uploadWithPresignedUrl({ file: FILE, requestUrl: async () => target() }),
    );

    expect(error).toMatchObject({ stage: "put", kind: "offline" });
  });

  it("fails with rate-limited on a 429", async () => {
    server.use(putReturning(429));

    const error = await failureOf(
      uploadWithPresignedUrl({ file: FILE, requestUrl: async () => target() }),
    );

    expect(error).toMatchObject({ stage: "put", kind: "rate-limited" });
  });

  it("fails with server on a 500", async () => {
    server.use(putReturning(500));

    const error = await failureOf(
      uploadWithPresignedUrl({ file: FILE, requestUrl: async () => target() }),
    );

    expect(error).toMatchObject({ stage: "put", kind: "server" });
  });

  it("fails with offline at the request-url stage when asking for the URL has no network", async () => {
    const requestUrl = async (): Promise<never> => {
      throw new TypeError("Network request failed");
    };

    const error = await failureOf(
      uploadWithPresignedUrl({ file: FILE, requestUrl }),
    );

    expect(error).toMatchObject({ stage: "request-url", kind: "offline" });
  });

  it("keeps an UploadError raised by the URL request, with its stage", async () => {
    const original = new UploadError({
      stage: "request-url",
      kind: "rate-limited",
    });

    const error = await failureOf(
      uploadWithPresignedUrl({
        file: FILE,
        requestUrl: async () => {
          throw original;
        },
      }),
    );

    expect(error).toBe(original);
  });

  it("is not an upload error when the failure is something else", () => {
    expect(isUploadError(new Error("boom"))).toBe(false);
    expect(isUploadError(undefined)).toBe(false);
  });
});
