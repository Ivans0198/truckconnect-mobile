import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { shouldCreateMissingSnapshot } from "./missing-snapshot-policy";
import { snapshotCreatedNotice } from "./visual-baseline-notice";

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
export const APP_URL = process.env.APP_URL ?? "http://localhost:3741";

// El reloj del navegador queda fijo en un día de la semana de los datos de
// prueba (viernes 27 de noviembre de 2026, 12:35 en Melbourne). Sin esto, la
// fila de "hoy" de Fatigue y las cuentas regresivas cambian con la fecha real
// y las capturas dejan de coincidir.
export const FIXED_NOW = new Date("2026-11-27T01:35:00.000Z");

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

export async function expectFullPageScreenshot(
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

// Captura un solo bloque, para secciones que la captura de página completa
// no alcanza porque la pantalla hace scroll por dentro.
export async function expectElementScreenshot(
  element: Locator,
  name: string,
): Promise<void> {
  await element.page().evaluate(() => document.fonts.ready);
  await createMissingLocalBaseline(name, () =>
    element.screenshot({ ...SCREENSHOT_OPTIONS }),
  );
  await expect(element).toHaveScreenshot(name, {
    ...SCREENSHOT_OPTIONS,
    maxDiffPixels: PAGE_MAX_DIFF_PIXELS,
  });
}

// Es una app de teléfono: sin tablet ni escritorio. 393×852 es el marco de
// los mockups (docs/mockups/*.png); 360×800 es el Android chico más común.
export const viewports = [
  { name: "phone", width: 393, height: 852 },
  { name: "android-small", width: 360, height: 800 },
] as const;

export const DRIVER_EMAIL = "driver@truckconnect.test";

export const driverAccount = {
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
export async function mockDriverLogin(page: Page): Promise<void> {
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

export async function signInAsDriver(page: Page): Promise<void> {
  await page.goto(APP_URL);
  await page.getByLabel("Email", { exact: true }).fill(DRIVER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("tab", { name: /Home/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
}

// El Modal de react-native-web aparece con un fade. axe lee los atributos
// aria-* en el instante en que corre, así que hay que esperar a que el
// diálogo termine de montarse y animar para que mida el estado estable.
export async function waitForAnimationsToFinish(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every(({ playState }) => playState !== "running"),
  );
}

const EMPTY_PAGE = { items: [], total: 0, page: 1, limit: 100, totalPages: 1 };

export function fulfillJson(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  } as const;
}

// Respuestas vacías por defecto de las lecturas de E5 (Docs, Profile y
// Notifications). Un test que necesita datos registra su propia ruta después:
// en Playwright gana la última registrada.
export async function mockEmptyLists(page: Page): Promise<void> {
  await page.route("**/compliance/**", (route) =>
    route.fulfill(fulfillJson(EMPTY_PAGE)),
  );
  await page.route("**/drivers/*/stats", (route) =>
    route.fulfill(fulfillJson(EMPTY_PAGE)),
  );
  await page.route("**/vehicles**", (route) =>
    route.fulfill(fulfillJson(EMPTY_PAGE)),
  );
  await page.route("**/notifications**", (route) =>
    route.fulfill(fulfillJson(EMPTY_PAGE)),
  );
}

// WCAG 2 A y AA, las mismas etiquetas que ya usa ui.spec.ts.
export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations,
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}
