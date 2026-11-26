import { defineConfig, devices } from "@playwright/test";

// Los mismos valores que factory.json → commands.dev y appUrl.
const PORT = 3741;
const APP_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // Sólo Linux tiene línea base visual versionada: en cualquier otra
  // plataforma esto avisa que la comparación es informativa, y que la primera
  // corrida de un checkout limpio crea las capturas que falten sin fallar por
  // ello.
  globalSetup: "./tests/support/visual-baseline-global-setup.ts",
  // El Stop gate no compara las capturas propias: cada historia con UI las
  // cambia, y las revisa una persona en el job visual del PR.
  ignoreSnapshots: !!process.env.FABRICA_IGNORE_SNAPSHOTS,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Expo web: la misma app con react-native-web, para que Playwright y el
    // ui-reviewer la vean. Es una aproximación de Android, no Android: lo
    // nativo se prueba con Maestro (.maestro/).
    command: `pnpm exec expo start --web --port ${PORT}`,
    url: APP_URL,
    // Off a propósito: si algo ya responde en esa URL, Playwright falla en vez
    // de adoptarlo. Un servidor ajeno en el puerto haría que la suite compare
    // baselines contra otra app. Para reusar el tuyo: FABRICA_REUSE_SERVER=1.
    reuseExistingServer: !!process.env.FABRICA_REUSE_SERVER,
    timeout: 180_000,
    env: { CI: "1", EXPO_NO_TELEMETRY: "1", BROWSER: "none" },
  },
});
