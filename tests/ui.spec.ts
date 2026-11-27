/**
 * Visual regression + accessibility gate.
 *
 * - toHaveScreenshot() compares pixel-by-pixel against an approved baseline.
 *   Only the Linux baseline (tests/ui.spec.ts-snapshots/*-linux.png) is
 *   versioned and binding. On Linux (e.g. the factory worker), generate or
 *   update it the usual way: npx playwright test --update-snapshots, then
 *   commit the PNG like any other file. On every PR,
 *   .github/workflows/visual-baselines.yml only COMPARES: it never
 *   regenerates, commits or pushes, so a red check always lands on the PR's
 *   real HEAD and the diff is left as the visual-diff artifact for a person
 *   to look at. Accepting a new baseline is a separate, deliberate act: a
 *   human runs that workflow by hand against the PR's branch. The baseline
 *   still only ever comes from one place, which is what stops two UI PRs in
 *   parallel from fighting over the same binary file.
 *
 * - On any other platform (Windows, macOS) there is no versioned baseline:
 *   *-win32.png is gitignored. The first local run creates one and every run
 *   after that compares against it, but it's local and nobody reviewed it,
 *   so it's informative only, not what decides whether a PR passes. The
 *   command says so itself (see tests/support/visual-baseline-notice.ts,
 *   wired as globalSetup in playwright.config.ts). That first run does NOT
 *   fail for the snapshots it had to create: it names each one and carries
 *   on. A snapshot that already exists and differs still fails.
 *
 * - AxeBuilder runs automated accessibility checks (contrast, labels, etc.).
 *   Requires: npm i -D @axe-core/playwright
 *
 * - REQUIRED in playwright.config.ts: a `webServer` block with
 *   `reuseExistingServer` off by default, so the suite boots its own dev
 *   server and never adopts one that belongs to another project answering on
 *   the same port. The Stop hook runs `npx playwright test` standalone;
 *   without webServer every test dies with ERR_CONNECTION_REFUSED and blocks
 *   the session for a reason unrelated to the code.
 */
import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import {
  APP_URL,
  DRIVER_EMAIL,
  FIXED_NOW,
  driverAccount,
  expectElementScreenshot,
  expectFullPageScreenshot,
  mockDriverLogin,
  mockEmptyLists,
  signInAsDriver,
  viewports,
  waitForAnimationsToFinish,
} from "./support/app";

// La captura no puede depender de que haya un backend arriba: toda llamada a
// la API se responde aquí, con la forma de docs/openapi.json. El patrón cubre
// cualquier host, así que nunca toca un API real (ni el de otro proyecto en
// localhost:3000).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW);
  await mockEmptyLists(page);
  await page.route("**/auth/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthorized" }),
    }),
  );
});

for (const vp of viewports) {
  test.describe(`sign-in @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("matches approved baseline", async ({ page }) => {
      await page.goto(APP_URL);
      // Sin sesión, "/" cae en el login: se captura con su encabezado ya visible.
      await page.getByText("Welcome back").waitFor();
      await expectFullPageScreenshot(page, `sign-in-${vp.name}.png`);
    });

    test("has no horizontal scroll", async ({ page }) => {
      await page.goto(APP_URL);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${vp.width}px`).toBe(false);
    });
  });
}

test("has no accessibility violations (axe-core)", async ({ page }) => {
  await page.goto(APP_URL);
  await page.getByText("Welcome back").waitFor();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});

for (const vp of viewports) {
  test.describe(`sign-in flow @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("signs in and lands on Home with the tab bar", async ({ page }) => {
      await mockDriverLogin(page);

      await signInAsDriver(page);

      await expect(page.getByText("Welcome back")).toHaveCount(0);
      await page.getByRole("heading", { name: "Home" }).waitFor();
      await expectFullPageScreenshot(page, `home-${vp.name}.png`);
    });

    test("home has no accessibility violations (axe-core)", async ({
      page,
    }) => {
      await mockDriverLogin(page);
      await signInAsDriver(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      expect(
        results.violations,
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });

    test("profile shows Log out and the confirmation dialog", async ({
      page,
    }) => {
      await mockDriverLogin(page);
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Profile/ }).click();
      await page.getByRole("heading", { name: "Profile" }).waitFor();
      await expectFullPageScreenshot(page, `profile-${vp.name}.png`);

      await page.getByRole("button", { name: "Log out" }).click();

      await expect(page.getByText("Log out?")).toBeVisible();
      await expectFullPageScreenshot(page, `log-out-dialog-${vp.name}.png`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations,
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });

    test("log out dialog has no horizontal scroll", async ({ page }) => {
      await mockDriverLogin(page);
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Profile/ }).click();
      await page.getByRole("button", { name: "Log out" }).click();
      await expect(page.getByText("Log out?")).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${vp.width}px`).toBe(false);
    });

    test("Cancel keeps the session and Log out returns to the sign-in", async ({
      page,
    }) => {
      await mockDriverLogin(page);
      let logoutCalls = 0;
      await page.route("**/auth/logout", (route) => {
        logoutCalls += 1;
        return route.fulfill({ status: 204 });
      });
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Profile/ }).click();

      await page.getByRole("button", { name: "Log out" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Log out?")).toHaveCount(0);
      expect(logoutCalls).toBe(0);

      await page.getByRole("button", { name: "Log out" }).click();
      await page
        .getByTestId("confirm-dialog")
        .getByRole("button", { name: "Log out" })
        .click();

      await expect(page.getByText("Welcome back")).toBeVisible();
      expect(logoutCalls).toBe(1);
    });

    test("shows the error and keeps the email on bad credentials", async ({
      page,
    }) => {
      await page.goto(APP_URL);
      await page.getByLabel("Email", { exact: true }).fill(DRIVER_EMAIL);
      await page.getByLabel("Password", { exact: true }).fill("wrong");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(
        page.getByText(
          "Incorrect email or password, or the account is not active",
        ),
      ).toBeVisible();
      await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
        DRIVER_EMAIL,
      );
      await expectFullPageScreenshot(page, `sign-in-error-${vp.name}.png`);
    });
  });
}

// Las formas de contracts/api-usage.md; 5h 30m trabajadas, break en 2h 12m.
async function mockFatigue(
  page: Page,
  status: Record<string, unknown> = {},
  events: unknown[] | "error" = [],
): Promise<void> {
  const now = FIXED_NOW.getTime();
  const fulfill = (body: unknown, code = 200) => ({
    status: code,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
  await page.route("**/fatigue/**", (route) => {
    const url = route.request().url();
    if (url.includes("/fatigue/status")) {
      return route.fulfill(
        fulfill({
          state: "working",
          driverId: driverAccount.id,
          hoursWorked: 5.5,
          breakMinutes: 45,
          dayStartedAt: new Date(now - 5.5 * 3_600_000).toISOString(),
          lastBreakEndAt: null,
          nextBreakDueAt: new Date(now + 132 * 60_000).toISOString(),
          hoursRemaining: 6.5,
          ...status,
        }),
      );
    }
    if (url.includes("/fatigue/week-summary")) {
      return route.fulfill(
        fulfill({
          totalHoursWorked: 38.1667,
          remainingHours: 33.8333,
          byDay: weekByDay,
        }),
      );
    }
    if (url.includes("/fatigue/end-day")) {
      return route.fulfill(fulfill({ ...endedDay }));
    }
    if (url.includes("/fatigue/events")) {
      return events === "error"
        ? route.fulfill(fulfill({ message: "boom" }, 500))
        : route.fulfill(fulfill(events));
    }
    return route.fulfill(fulfill([]));
  });
}

// La semana del mockup 12, de lunes a viernes.
const weekByDay = [
  { date: "2026-11-23", hours: 7.8 },
  { date: "2026-11-24", hours: 9 },
  { date: "2026-11-25", hours: 6.0333 },
  { date: "2026-11-26", hours: 9.8333 },
  { date: "2026-11-27", hours: 5.5 },
];

// Cinco eventos de hoy, a hora fija de Melbourne para que la captura no varíe.
const todayEvents = [
  ["DAY_START", "2026-11-26T19:35:00.000Z"],
  ["BREAK_START", "2026-11-26T22:48:00.000Z"],
  ["BREAK_END", "2026-11-26T23:03:00.000Z"],
  ["BREAK_START", "2026-11-27T01:00:00.000Z"],
  ["BREAK_END", "2026-11-27T01:30:00.000Z"],
].map(([eventType, timestamp], index) => ({
  id: `e${index + 1}`,
  eventType,
  driverId: driverAccount.id,
  timestamp,
}));

const endedDay = { state: "off_duty", hoursWorked: 5.5, hoursRemaining: 6.5 };

// La app reintenta una lectura fallida 3 veces (1 s, 2 s, 4 s) antes del error.
const QUERY_RETRY_TIMEOUT_MS = 15_000;

async function openFatigue(page: Page): Promise<void> {
  await mockDriverLogin(page);
  await signInAsDriver(page);
  await page.getByRole("tab", { name: /Fatigue/ }).click();
  await page.getByRole("heading", { name: "Fatigue" }).waitFor();
}

for (const vp of viewports) {
  test.describe(`fatigue @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows the hours ring and the three stats", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);

      await expect(
        page.getByText("5h 30m", { exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByText("2h 12m")).toBeVisible();
      await expect(page.getByText("38h / 72h")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-${vp.name}.png`);
    });

    test("lists today's events", async ({ page }) => {
      await mockFatigue(page, {}, todayEvents);
      await openFatigue(page);

      await expect(page.getByText("5 events")).toBeVisible();
      await expect(page.getByText("15 min", { exact: true })).toBeVisible();
      await expect(page.getByText("12:30 PM", { exact: true })).toBeVisible();
      const events = page.getByTestId("today-events");
      await events.scrollIntoViewIfNeeded();
      await expectElementScreenshot(events, `fatigue-events-${vp.name}.png`);
    });

    test("says there are no events yet", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);

      await expect(page.getByText("No events yet today.")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-no-events-${vp.name}.png`);
    });

    test("shows the events error and keeps the ring", async ({ page }) => {
      await mockFatigue(page, {}, "error");
      await openFatigue(page);

      await expect(
        page.getByText("Could not load today's events."),
      ).toBeVisible({ timeout: QUERY_RETRY_TIMEOUT_MS });
      await expect(
        page.getByText("5h 30m", { exact: true }).first(),
      ).toBeVisible();
      await expectFullPageScreenshot(
        page,
        `fatigue-events-error-${vp.name}.png`,
      );
    });

    test("shows the amber and red tones", async ({ page }) => {
      await mockFatigue(page, { hoursWorked: 10, hoursRemaining: 2 });
      await openFatigue(page);
      await expect(page.getByText("10h 00m")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-amber-${vp.name}.png`);

      await page.unrouteAll({ behavior: "ignoreErrors" });
      await mockDriverLogin(page);
      await mockFatigue(page, { hoursWorked: 11.5, hoursRemaining: 0.5 });
      await page.reload();
      await signInAsDriver(page);
      await page.getByRole("tab", { name: /Fatigue/ }).click();
      await expect(page.getByText("11h 30m")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-red-${vp.name}.png`);
    });

    test("warns that new orders cannot be accepted", async ({ page }) => {
      await mockFatigue(page, {
        hoursWorked: 12,
        hoursRemaining: 0,
        nextBreakDueAt: new Date(
          FIXED_NOW.getTime() - 30 * 60_000,
        ).toISOString(),
      });
      await openFatigue(page);

      await expect(page.getByText("You can't accept new orders")).toBeVisible();
      await expect(page.getByText("Daily limit reached")).toBeVisible();
      await expect(page.getByText("Break overdue")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-blocked-${vp.name}.png`);
    });

    test("shows no warning inside the hours", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);

      await expect(page.getByText("5h 30m").first()).toBeVisible();
      await expect(page.getByText("You can't accept new orders")).toHaveCount(
        0,
      );
    });

    test("shows the error with Try again when the server fails", async ({
      page,
    }) => {
      await page.route("**/fatigue/**", (route) =>
        route.fulfill({ status: 500 }),
      );
      await openFatigue(page);

      await expect(
        page.getByRole("button", { name: "Try again" }).first(),
      ).toBeVisible({ timeout: QUERY_RETRY_TIMEOUT_MS });
      await expectFullPageScreenshot(page, `fatigue-error-${vp.name}.png`);
    });

    test("shows the week section error with Try again", async ({ page }) => {
      await mockFatigue(page);
      await page.route("**/fatigue/week-summary", (route) =>
        route.fulfill({ status: 500 }),
      );
      await openFatigue(page);

      await expect(page.getByText("Could not load this week.")).toBeVisible({
        timeout: QUERY_RETRY_TIMEOUT_MS,
      });
      await expectFullPageScreenshot(page, `fatigue-week-error-${vp.name}.png`);
    });

    test("shows the week with a row per day", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);

      const week = page.getByTestId("week-summary");
      await week.scrollIntoViewIfNeeded();
      await expect(page.getByText("Total worked")).toBeVisible();
      // La página completa no muestra la sección (la pantalla hace scroll
      // por dentro): se captura el bloque con sus cinco días.
      await expectElementScreenshot(week, `fatigue-week-${vp.name}.png`);
    });

    test("asks End your day? and has no accessibility violations", async ({
      page,
    }) => {
      await mockFatigue(page);
      await openFatigue(page);
      await page.getByRole("button", { name: "End Day" }).click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText("End your day?")).toBeVisible();
      await waitForAnimationsToFinish(page);
      await expectFullPageScreenshot(page, `fatigue-end-day-${vp.name}.png`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations,
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });

    test("shows the action buttons while working", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);

      await expect(
        page.getByRole("button", { name: "Take Break" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "End Day" })).toBeVisible();
    });

    test("shows the loading skeleton before the data arrives", async ({
      page,
    }) => {
      await page.route("**/fatigue/**", () => new Promise(() => undefined));
      await openFatigue(page);

      await expect(page.getByLabel("Loading your hours")).toBeVisible();
      await expectFullPageScreenshot(page, `fatigue-loading-${vp.name}.png`);
    });

    test("has no horizontal scroll", async ({ page }) => {
      await mockFatigue(page);
      await openFatigue(page);
      await page.getByText("5h 30m", { exact: true }).first().waitFor();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${vp.width}px`).toBe(false);
    });

    test("has no accessibility violations (axe-core)", async ({ page }) => {
      await mockFatigue(page, {}, todayEvents);
      await openFatigue(page);
      await page.getByText("5h 30m", { exact: true }).first().waitFor();
      await page.getByText("5 events").waitFor();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(
        results.violations,
        JSON.stringify(results.violations, null, 2),
      ).toEqual([]);
    });
  });
}

test("keeps Sign in visible at 360x800 with the password field focused", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(APP_URL);

  await page.getByLabel("Password", { exact: true }).focus();

  await expect(page.getByRole("button", { name: "Sign in" })).toBeInViewport();
});

test("login screen has no accessibility violations with an error shown", async ({
  page,
}) => {
  await page.goto(APP_URL);
  await page.getByLabel("Email", { exact: true }).fill(DRIVER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Incorrect email or password").waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
});
