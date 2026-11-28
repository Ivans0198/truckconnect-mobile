import { test, expect, type Page } from "@playwright/test";

import {
  FIXED_NOW,
  expectFullPageScreenshot,
  expectNoAxeViolations,
  fulfillJson,
  mockDriverLogin,
  mockEmptyLists,
  signInAsDriver,
  viewports,
} from "./support/app";

const MS_PER_DAY = 86_400_000;
// La query reintenta antes de rendirse: el error tarda en aparecer.
const QUERY_RETRIES_MS = 30_000;

// Las formas de contracts/api-usage.md. Las fechas cuentan desde el reloj fijo.
function documentIn(
  id: string,
  docType: string,
  days: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    docType,
    status: "APPROVED",
    driverId: "11111111-1111-4111-8111-111111111111",
    vehicleId: null,
    issueDate: "2024-01-10T00:00:00.000Z",
    expiryDate: new Date(FIXED_NOW.getTime() + days * MS_PER_DAY).toISOString(),
    fileKey: `documents/${id}.pdf`,
    fileMimeType: "application/pdf",
    fileSizeBytes: 120_000,
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    downloadUrl: `https://files.test/${id}.pdf`,
    createdAt: "2025-01-10T00:00:00.000Z",
    updatedAt: "2025-01-10T00:00:00.000Z",
    ...overrides,
  };
}

async function serveDocuments(page: Page, items: unknown[]): Promise<void> {
  await page.route("**/compliance/documents**", (route) =>
    route.fulfill(
      fulfillJson({
        items,
        total: items.length,
        page: 1,
        limit: 100,
        totalPages: 1,
      }),
    ),
  );
}

async function openDocs(page: Page): Promise<void> {
  await signInAsDriver(page);
  await page.getByRole("tab", { name: /Docs/ }).click();
  await page.getByRole("heading", { name: "Compliance" }).waitFor();
}

const allValid = [
  documentIn("a", "DRIVER_LICENCE", 400),
  documentIn("b", "VEHICLE_REGO", 180),
  documentIn("c", "PUBLIC_LIABILITY", 300),
  documentIn("d", "TRAILER_REGO", 250),
  documentIn("e", "DANGEROUS_GOODS", 500),
];

const withAttention = [
  documentIn("a", "DRIVER_LICENCE", 400),
  documentIn("b", "VEHICLE_REGO", 180),
  documentIn("c", "PUBLIC_LIABILITY", 32),
  documentIn("d", "TRAILER_REGO", 5),
  documentIn("e", "DANGEROUS_GOODS", 500, {
    status: "REJECTED",
    rejectionReason: "The photo is blurry. Upload a sharper one.",
    createdAt: "2026-11-25T00:00:00.000Z",
  }),
];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await mockDriverLogin(page);
});

for (const vp of viewports) {
  test.describe(`docs @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows valid documents with no banner", async ({ page }) => {
      await serveDocuments(page, allValid);
      await openDocs(page);

      await expect(page.getByText("Driver Licence")).toBeVisible();
      await expect(page.getByText("Valid")).toHaveCount(5);
      await expect(page.getByText(/need.* attention/)).toHaveCount(0);
      await expect(page.getByText("How alerts work")).toBeVisible();
      await expectFullPageScreenshot(page, `docs-valid-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("shows the banner and the cards that need attention", async ({
      page,
    }) => {
      await serveDocuments(page, withAttention);
      await openDocs(page);

      await expect(page.getByText("3 documents need attention")).toBeVisible();
      await expect(page.getByText("5 days").first()).toBeVisible();
      await expect(page.getByText("Rejected")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Upload renewed document" }),
      ).toHaveCount(2);
      await expect(
        page.getByRole("button", { name: "Upload again" }),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `docs-attention-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("invites to add the first document when there are none", async ({
      page,
    }) => {
      await serveDocuments(page, []);
      await openDocs(page);

      await expect(page.getByText("No documents yet")).toBeVisible();
      await expectFullPageScreenshot(page, `docs-empty-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("shows the error with Try again, and recovers", async ({ page }) => {
      await page.route("**/compliance/documents**", (route) =>
        route.fulfill(fulfillJson({ message: "boom" }, 500)),
      );
      await openDocs(page);

      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        { timeout: QUERY_RETRIES_MS },
      );
      await expectFullPageScreenshot(page, `docs-error-${vp.name}.png`);
      await expectNoAxeViolations(page);

      await serveDocuments(page, allValid);
      await page.getByRole("button", { name: "Try again" }).click();
      await expect(page.getByText("Driver Licence")).toBeVisible();
    });
  });
}
