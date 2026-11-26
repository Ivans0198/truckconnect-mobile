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
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { shouldCreateMissingSnapshot } from "./support/missing-snapshot-policy";
import { snapshotCreatedNotice } from "./support/visual-baseline-notice";

// Con qué condiciones se toma cada captura, sembrada o comparada. Hoy
// coinciden con los valores por defecto de toHaveScreenshot, pero se pasan a
// mano y a los dos lados a propósito: la captura sembrada la compara la
// propia corrida un instante después, así que si un día Playwright cambiara
// un default, la semilla y la comparación dejarían de salir de las mismas
// condiciones y la primera corrida volvería a fallar, esta vez disfrazada de
// regresión visual.
const SCREENSHOT_OPTIONS = {
  animations: "disabled",
  caret: "hide",
  scale: "css",
} as const;

/**
 * Escribe la captura local que falte, ANTES de compararla.
 *
 * Fuera de Linux no hay línea base versionada, así que la primera corrida de
 * un checkout limpio no tiene con qué comparar. Playwright escribe la captura
 * que falta y aun así hunde el test (con `updateSnapshots: 'missing'`, que es
 * su valor por defecto, devuelve un `softError`): las capturas recién creadas
 * se leían como otras tantas regresiones visuales, y el remedio, correr
 * Playwright dos veces, no estaba escrito en ninguna parte.
 *
 * El matcher corre igual, siempre. En la corrida que siembra compara contra la
 * foto recién tomada, así que ahí sólo puede fallar si la página no estaba
 * quieta; de la siguiente en adelante compara de verdad. Una captura que ya
 * existe no se toca, ni aquí ni en Linux.
 *
 * De lo que depende que la semilla sea buena: `toHaveScreenshot` reintenta
 * hasta que dos capturas seguidas coinciden, y esto toma una sola. Que valga
 * se apoya en que las animaciones van desactivadas y en que ya se esperó a
 * `document.fonts.ready`. Quien meta una entrada animada en la página tendrá
 * que mirar aquí antes de preguntarse por qué la primera corrida se puso
 * caprichosa.
 */
async function createMissingLocalBaseline(
  name: string,
  capture: () => Promise<Buffer>,
): Promise<void> {
  const expectedPath = test.info().snapshotPath(name, { kind: "screenshot" });
  if (
    !shouldCreateMissingSnapshot(process.platform, existsSync(expectedPath))
  ) {
    return;
  }
  await mkdir(path.dirname(expectedPath), { recursive: true });
  await writeFile(expectedPath, await capture());
  console.log(snapshotCreatedNotice(name));
}

// Filled by /bootstrap with this project's own port. Never hardcode 3000:
// every factory on the machine would fight over it and test each other's app.
const APP_URL = process.env.APP_URL ?? "http://localhost:3741";

// La captura no puede depender de que haya un backend arriba: toda llamada a
// la API se responde aquí, con la forma de docs/openapi.json. El patrón cubre
// cualquier host, así que nunca toca un API real (ni el de otro proyecto en
// localhost:3000).
test.beforeEach(async ({ page }) => {
  await page.route("**/auth/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthorized" }),
    }),
  );
});

// Presupuesto ABSOLUTO, no un ratio. Un `maxDiffPixelRatio` crece con el alto
// de la página, así que en una página larga un componente pequeño puede
// cambiar por completo sin llegar al umbral: un botón desalineado, un color de
// acento equivocado o un icono que no carga caben todos dentro del 1%. Con un
// número fijo, el presupuesto no depende de cuánto scroll tenga la página.
//
// El 20 es un punto de partida, no una medida de TU proyecto. Para fijarlo con
// datos: pon esto a 0, abre un PR sin cambios visuales y deja que el workflow
// compare dos veces; lo que reporte es el ruido real de tu render en CI. Si
// reporta 0, como es lo normal en un runner estable, cualquier número pequeño
// sirve y este vale. Si reporta más, súbelo hasta pasar el ruido y no más.
const PAGE_MAX_DIFF_PIXELS = 20;

async function expectFullPageScreenshot(
  page: Page,
  name: string,
): Promise<void> {
  // networkidle nunca llega mientras el dev server compila bajo carga paralela.
  // Lo que de verdad mueve píxeles son las fuentes y las imágenes, y
  // toHaveScreenshot ya reintenta hasta que la página deja de cambiar.
  // La captura de página completa no hace scroll: una imagen con
  // loading="lazy" fuera del primer pantallazo saldría vacía o no según
  // el momento. Se cargan todas antes.
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map((image) => image.decode().catch(() => undefined)),
    );
    await document.fonts.ready;
  });
  await createMissingLocalBaseline(name, () =>
    page.screenshot({ ...SCREENSHOT_OPTIONS, fullPage: true }),
  );
  await expect(page).toHaveScreenshot(name, {
    ...SCREENSHOT_OPTIONS,
    fullPage: true,
    maxDiffPixels: PAGE_MAX_DIFF_PIXELS,
  });
}

// Es una app de teléfono: sin tablet ni escritorio. 393×852 es el marco de
// los mockups (docs/mockups/*.png); 360×800 es el Android chico más común.
const viewports = [
  { name: "phone", width: 393, height: 852 },
  { name: "android-small", width: 360, height: 800 },
] as const;

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

const DRIVER_EMAIL = "driver@truckconnect.test";

const driverAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  email: DRIVER_EMAIL,
  fullName: "Dana Driver",
  phone: "+61400000000",
  role: "DRIVER",
  status: "ACTIVE",
  emergencyContact: null,
  abn: null,
  licenceClass: null,
  licenceNumber: null,
  emailVerified: true,
  phoneVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: null,
  lastSeenAt: null,
};

// Los mismos paths del contrato que usa jest con msw (contracts/api-usage.md).
async function mockDriverLogin(page: Page): Promise<void> {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "access-1",
        refreshToken: "refresh-1",
      }),
    }),
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(driverAccount),
    }),
  );
}

async function signInAsDriver(page: Page): Promise<void> {
  await page.goto(APP_URL);
  await page.getByLabel("Email", { exact: true }).fill(DRIVER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("tab", { name: /Home/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
}

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
