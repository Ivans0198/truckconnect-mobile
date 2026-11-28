import { melbourneDaysUntil } from "@/format/time";
import { COMPLIANCE_NOW } from "@/test/compliance-fixtures";
import { TEST_API_URL } from "@/test/env";

import { createDevComplianceRoutes } from "./dev-compliance-handlers";
import { createMockedFetch } from "./mocked-fetch";

type Document = { docType: string; status: string; expiryDate: string };
type Page = { items: Document[]; total: number };

function createFetch(): typeof globalThis.fetch {
  return createMockedFetch({
    routes: createDevComplianceRoutes(TEST_API_URL, () => COMPLIANCE_NOW),
    realFetch: jest.fn(),
    baseUrl: TEST_API_URL,
  });
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function listDocuments(fetch: typeof globalThis.fetch): Promise<Page> {
  const response = await fetch(`${TEST_API_URL}/compliance/documents`);
  return response.json();
}

describe("dev compliance handlers", () => {
  it("lists a Public Liability document that expires in 32 days", async () => {
    const { items } = await listDocuments(createFetch());

    const publicLiability = items.find((d) => d.docType === "PUBLIC_LIABILITY");
    expect(publicLiability?.status).toBe("APPROVED");
    expect(
      melbourneDaysUntil(publicLiability?.expiryDate ?? "", COMPLIANCE_NOW),
    ).toBe(32);
  });

  it("points the upload URL at the dev uploads of the same base URL", async () => {
    const fetch = createFetch();

    const response = await fetch(
      `${TEST_API_URL}/compliance/documents/upload-url`,
      json("POST", {
        docType: "PUBLIC_LIABILITY",
        mimeType: "application/pdf",
        fileSizeBytes: 9,
      }),
    );

    const target = await response.json();
    expect(response.status).toBe(201);
    expect(target.uploadUrl).toBe(
      `${TEST_API_URL}/__dev-uploads/${target.fileKey}`,
    );
    expect(target.expiresInSeconds).toBeGreaterThan(0);
  });

  it("accepts the PUT to the dev uploads with a 200", async () => {
    const response = await createFetch()(
      `${TEST_API_URL}/__dev-uploads/documents/dev-1.pdf`,
      { method: "PUT", body: "bytes" },
    );

    expect(response.status).toBe(200);
  });

  it("lists a registered document as PENDING_REVIEW", async () => {
    const fetch = createFetch();

    const registered = await fetch(
      `${TEST_API_URL}/compliance/documents`,
      json("POST", {
        docType: "PUBLIC_LIABILITY",
        issueDate: "2026-11-27",
        expiryDate: "2027-11-27",
        fileKey: "documents/dev-1.pdf",
        fileMimeType: "application/pdf",
        fileSizeBytes: 9,
      }),
    );

    expect(registered.status).toBe(201);
    const { items } = await listDocuments(fetch);
    expect(
      items.filter(
        (d) =>
          d.docType === "PUBLIC_LIABILITY" && d.status === "PENDING_REVIEW",
      ),
    ).toHaveLength(1);
  });

  it("rejects a registration without a file key with a 400", async () => {
    const response = await createFetch()(
      `${TEST_API_URL}/compliance/documents`,
      json("POST", { docType: "PUBLIC_LIABILITY" }),
    );

    expect(response.status).toBe(400);
  });

  it("answers the reads the other tabs make so they load", async () => {
    const fetch = createFetch();

    const stats = await fetch(
      `${TEST_API_URL}/drivers/any-id/stats?period=month`,
    );
    const vehicles = await fetch(`${TEST_API_URL}/vehicles?page=1&limit=100`);
    const notifications = await fetch(
      `${TEST_API_URL}/notifications?unread=true&page=1&limit=1`,
    );

    expect(stats.status).toBe(200);
    expect((await stats.json()).totalOrders).toEqual(expect.any(Number));
    expect((await vehicles.json()).items.length).toBeGreaterThan(0);
    expect((await notifications.json()).total).toEqual(expect.any(Number));
  });
});
