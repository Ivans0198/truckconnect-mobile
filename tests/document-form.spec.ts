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
const UPLOAD_HOST = "https://uploads.test";

function document(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-pl",
    docType: "PUBLIC_LIABILITY",
    status: "APPROVED",
    driverId: "11111111-1111-4111-8111-111111111111",
    vehicleId: null,
    issueDate: "2025-06-10T00:00:00.000Z",
    expiryDate: new Date(FIXED_NOW.getTime() + 32 * MS_PER_DAY).toISOString(),
    fileKey: "documents/doc-pl.pdf",
    fileMimeType: "application/pdf",
    fileSizeBytes: 120_000,
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    downloadUrl: "https://files.test/doc-pl.pdf",
    createdAt: "2025-06-10T00:00:00.000Z",
    updatedAt: "2025-06-10T00:00:00.000Z",
    ...overrides,
  };
}

const listOf = (items: unknown[]) =>
  fulfillJson({
    items,
    total: items.length,
    page: 1,
    limit: 100,
    totalPages: 1,
  });

type Backend = { registered: unknown[]; openRegister: () => void };

// El back y el almacenamiento simulados. `register` espera a `openRegister`
// cuando el test quiere ver el envío en curso.
async function serveBackend(
  page: Page,
  options: { holdRegister?: boolean } = {},
): Promise<Backend> {
  const backend: Backend = { registered: [], openRegister: () => undefined };
  const gate = new Promise<void>((resolve) => {
    backend.openRegister = resolve;
  });
  await page.route("**/compliance/documents**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      const renewed = backend.registered.length > 0;
      return route.fulfill(
        listOf(
          renewed
            ? [
                document(),
                document({
                  id: "doc-new",
                  status: "PENDING_REVIEW",
                  createdAt: "2026-11-27T00:00:00.000Z",
                }),
              ]
            : [document()],
        ),
      );
    }
    if (request.url().endsWith("/upload-url")) {
      return route.fulfill(
        fulfillJson(
          {
            uploadUrl: `${UPLOAD_HOST}/documents/doc-new.pdf`,
            fileKey: "documents/doc-new.pdf",
            expiresInSeconds: 900,
          },
          201,
        ),
      );
    }
    if (options.holdRegister) await gate;
    backend.registered.push(request.postDataJSON());
    return route.fulfill(fulfillJson(document({ id: "doc-new" }), 201));
  });
  await page.route(`${UPLOAD_HOST}/**`, (route) =>
    route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*" },
    }),
  );
  return backend;
}

async function openFormFromCard(page: Page): Promise<void> {
  await signInAsDriver(page);
  await page.getByRole("tab", { name: /Docs/ }).click();
  await page.getByRole("button", { name: "Upload renewed document" }).click();
  await page.getByRole("heading", { name: "Upload document" }).waitFor();
}

async function chooseFile(page: Page): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose file" }).click();
  await (
    await chooser
  ).setFiles({
    name: "policy.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test"),
  });
  await expect(page.getByText("policy.pdf")).toBeVisible();
}

async function fillDates(page: Page): Promise<void> {
  await page.getByLabel("Issue date", { exact: true }).fill("2026-06-17");
  await page.getByLabel("Expiry date", { exact: true }).fill("2027-06-17");
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await mockDriverLogin(page);
});

for (const vp of viewports) {
  test.describe(`document form @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("opens from a card with the type chosen and renews the document", async ({
      page,
    }) => {
      const backend = await serveBackend(page);
      await openFormFromCard(page);

      // Docs sigue montada bajo el modal: el tipo elegido se ve por su botón.
      await expect(
        page.getByRole("button", { name: "Change type" }),
      ).toBeVisible();
      await expect(page.getByRole("radio")).toHaveCount(0);
      await expectFullPageScreenshot(page, `form-type-chosen-${vp.name}.png`);
      await expectNoAxeViolations(page);

      await chooseFile(page);
      await fillDates(page);
      await expectFullPageScreenshot(page, `form-file-chosen-${vp.name}.png`);
      await expectNoAxeViolations(page);

      await page.getByRole("button", { name: "Submit" }).click();

      await expect(
        page.getByRole("heading", { name: "Compliance" }),
      ).toBeVisible();
      await expect(page.getByText("Under review")).toBeVisible();
      expect(backend.registered).toEqual([
        {
          docType: "PUBLIC_LIABILITY",
          issueDate: "2026-06-17",
          expiryDate: "2027-06-17",
          fileKey: "documents/doc-new.pdf",
          fileMimeType: "application/pdf",
          fileSizeBytes: 13,
        },
      ]);
    });

    test("opens from the plus asking for the type first", async ({ page }) => {
      await serveBackend(page);
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Docs/ }).click();
      await page.getByRole("button", { name: "Add document" }).click();

      await expect(page.getByRole("radio")).toHaveCount(5);
      await expectFullPageScreenshot(page, `form-no-type-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("marks the fields that are missing and sends nothing", async ({
      page,
    }) => {
      const backend = await serveBackend(page);
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Docs/ }).click();
      await page.getByRole("button", { name: "Add document" }).click();

      await page.getByRole("button", { name: "Submit" }).click();

      await expect(page.getByText("Choose a document type.")).toBeVisible();
      await expect(page.getByText("Add a photo or a file.")).toBeVisible();
      await expect(page.getByText("Select the issue date.")).toBeVisible();
      await expect(page.getByText("Select the expiry date.")).toBeVisible();
      await expectFullPageScreenshot(page, `form-errors-${vp.name}.png`);
      await expectNoAxeViolations(page);
      expect(backend.registered).toEqual([]);
    });

    test("shows the progress while the document uploads", async ({ page }) => {
      const backend = await serveBackend(page, { holdRegister: true });
      await openFormFromCard(page);
      await chooseFile(page);
      await fillDates(page);

      await page.getByRole("button", { name: "Submit" }).click();

      await expect(page.getByText("Uploading your document...")).toBeVisible();
      await expectFullPageScreenshot(page, `form-uploading-${vp.name}.png`);
      await expectNoAxeViolations(page);
      backend.openRegister();
      await expect(
        page.getByRole("heading", { name: "Compliance" }),
      ).toBeVisible();
    });

    test("keeps the form and offers Try again when the upload fails", async ({
      page,
    }) => {
      await serveBackend(page);
      await page.route("**/compliance/documents/upload-url", (route) =>
        route.fulfill(fulfillJson({ message: "boom" }, 500)),
      );
      await openFormFromCard(page);
      await chooseFile(page);
      await fillDates(page);

      await page.getByRole("button", { name: "Submit" }).click();

      await expect(
        page.getByText(/The document was not uploaded/),
      ).toBeVisible();
      await expect(page.getByText("policy.pdf")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Try again" }),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `form-error-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });
  });
}
