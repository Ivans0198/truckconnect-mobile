import { test, expect, type Page } from "@playwright/test";

import {
  FIXED_NOW,
  driverAccount,
  expectFullPageScreenshot,
  expectNoAxeViolations,
  fulfillJson,
  mockDriverLogin,
  mockEmptyLists,
  signInAsDriver,
  viewports,
} from "./support/app";

const MS_PER_DAY = 86_400_000;

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
    driverId: driverAccount.id,
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

// Lecturas de fatiga dentro de las horas: el único aviso es el de compliance.
async function serveFatigue(page: Page): Promise<void> {
  const now = FIXED_NOW.getTime();
  await page.route("**/fatigue/**", (route) => {
    const url = route.request().url();
    if (url.includes("/fatigue/status")) {
      return route.fulfill(
        fulfillJson({
          state: "working",
          driverId: driverAccount.id,
          hoursWorked: 5.5,
          breakMinutes: 45,
          dayStartedAt: new Date(now - 5.5 * 3_600_000).toISOString(),
          lastBreakEndAt: null,
          nextBreakDueAt: new Date(now + 132 * 60_000).toISOString(),
          hoursRemaining: 6.5,
        }),
      );
    }
    if (url.includes("/fatigue/week-summary")) {
      return route.fulfill(
        fulfillJson({ totalHoursWorked: 38, remainingHours: 34, byDay: [] }),
      );
    }
    return route.fulfill(fulfillJson([]));
  });
}

const amber = [
  documentIn("a", "DRIVER_LICENCE", 400),
  documentIn("c", "PUBLIC_LIABILITY", 32),
];
const red = [
  documentIn("a", "DRIVER_LICENCE", 400),
  documentIn("c", "PUBLIC_LIABILITY", 5),
  documentIn("d", "TRAILER_REGO", 40),
];
const amberOnly = [documentIn("a", "DRIVER_LICENCE", 400)];

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await mockDriverLogin(page);
});

for (const vp of viewports) {
  test.describe(`home compliance banner @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows the amber banner and the dot on Docs", async ({ page }) => {
      await serveDocuments(page, amber);
      await signInAsDriver(page);

      await expect(
        page.getByText(
          "Public Liability expires in 32 days. Renew now to avoid being blocked from new orders.",
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("tab", { name: "Docs, needs attention" }),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `home-amber-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("shows the red banner with the others counted", async ({ page }) => {
      await serveDocuments(page, red);
      await signInAsDriver(page);

      await expect(
        page.getByText(/^Public Liability expires in 5 days\./),
      ).toBeVisible();
      await expect(page.getByText("and 1 more")).toBeVisible();
      await expectFullPageScreenshot(page, `home-red-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("opens Docs when the banner is tapped", async ({ page }) => {
      await serveDocuments(page, amber);
      await signInAsDriver(page);

      await page
        .getByRole("button", { name: /Public Liability expires/ })
        .click();

      await expect(
        page.getByRole("heading", { name: "Compliance" }),
      ).toBeVisible();
    });

    test("shows no banner and no dot when everything is valid", async ({
      page,
    }) => {
      await serveDocuments(page, amberOnly);
      await signInAsDriver(page);

      await expect(page.getByRole("tab", { name: "Docs" })).toBeVisible();
      await expect(page.getByText(/expires in/)).toHaveCount(0);
      await expect(
        page.getByRole("tab", { name: "Docs, needs attention" }),
      ).toHaveCount(0);
      await expectNoAxeViolations(page);
    });

    test("lists the compliance reason on Fatigue", async ({ page }) => {
      await serveDocuments(page, red);
      await serveFatigue(page);
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Fatigue/ }).click();

      await expect(page.getByText("You can't accept new orders")).toBeVisible();
      await expect(
        page
          .getByTestId("acceptance-banner")
          .getByText("Public Liability expires in 5 days"),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-compliance-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });
  });
}
