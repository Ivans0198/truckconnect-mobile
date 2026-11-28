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

// La query reintenta antes de rendirse: el error tarda en aparecer.
const QUERY_RETRIES_MS = 30_000;

const fullAccount = {
  ...driverAccount,
  fullName: "David Chen",
  email: "david.chen@truckconnect.com.au",
  phone: "+61412555102",
  abn: "12345678901",
  licenceClass: "HC",
  emergencyContact: { name: "Anna Chen", phone: "+61412555199" },
  createdAt: "2026-03-10T00:00:00.000Z",
};

const vehicle = {
  id: "vehicle-1",
  driverId: driverAccount.id,
  type: "SEMI_TRAILER",
  registrationNumber: "XYZ 847",
  state: "VIC",
  make: "Volvo",
  model: "FH",
  year: 2022,
  gvmKg: 42_500,
  maxPayloadKg: 26_000,
  palletCapacity: 24,
  cargoLengthM: 13.6,
  cargoWidthM: 2.4,
  cargoHeightM: 1.6,
  hasTailLift: false,
  isActive: true,
  createdAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-03-01T00:00:00.000Z",
};

async function serveProfile(
  page: Page,
  vehicles: unknown[] = [vehicle],
): Promise<void> {
  await page.route("**/auth/me", (route) =>
    route.fulfill(fulfillJson(fullAccount)),
  );
  await page.route("**/drivers/*/stats**", (route) =>
    route.fulfill(
      fulfillJson({
        period: "month",
        hoursWorked: 120,
        totalEarningsCents: 0,
        totalOrders: 147,
        avgMargin: 0.1,
      }),
    ),
  );
  await page.route("**/vehicles**", (route) =>
    route.fulfill(
      fulfillJson({
        items: vehicles,
        total: vehicles.length,
        page: 1,
        limit: 100,
        totalPages: 1,
      }),
    ),
  );
}

async function openProfile(page: Page): Promise<void> {
  await signInAsDriver(page);
  await page.getByRole("tab", { name: /Profile/ }).click();
  await page.getByRole("heading", { name: "David Chen" }).waitFor();
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await mockDriverLogin(page);
});

for (const vp of viewports) {
  test.describe(`profile @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows every datum of the driver", async ({ page }) => {
      await serveProfile(page);
      await openProfile(page);

      await expect(page.getByText("Heavy Combination (HC)")).toBeVisible();
      await expect(page.getByText("ABN 12 345 678 901")).toBeVisible();
      await expect(page.getByText("147")).toBeVisible();
      await expect(page.getByText("8mo")).toBeVisible();
      await expect(page.getByText("Volvo FH 2022")).toBeVisible();
      await expect(page.getByText("Semi-trailer")).toBeVisible();
      await expect(
        page.getByText("TruckConnect Driver · v0.1.0"),
      ).toBeVisible();
      await expectFullPageScreenshot(page, `profile-full-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("says No vehicle on file", async ({ page }) => {
      await serveProfile(page, []);
      await openProfile(page);

      await expect(page.getByText("No vehicle on file")).toBeVisible();
      await expectFullPageScreenshot(page, `profile-no-vehicle-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });

    test("fails one section and keeps the rest and Log out", async ({
      page,
    }) => {
      await serveProfile(page);
      await page.route("**/vehicles**", (route) =>
        route.fulfill(fulfillJson({ message: "boom" }, 500)),
      );
      await openProfile(page);

      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible(
        { timeout: QUERY_RETRIES_MS },
      );
      await expect(page.getByText("Personal info")).toBeVisible();
      await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
      await expectFullPageScreenshot(page, `profile-error-${vp.name}.png`);
      await expectNoAxeViolations(page);
    });
  });
}
