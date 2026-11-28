import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_API_URL } from "@/api/config";

import { DEV_DRIVER_EMAIL, DEV_DRIVER_PASSWORD } from "./dev-auth-handlers";
import { startDevMocks } from "./start-dev-mocks.native";

describe("startDevMocks", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("replaces the global fetch with one that answers a login", async () => {
    startDevMocks();

    const response = await globalThis.fetch(`${DEFAULT_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEV_DRIVER_EMAIL,
        password: DEV_DRIVER_PASSWORD,
      }),
    });
    expect(response.status).toBe(200);
  });

  it("also answers the compliance documents", async () => {
    startDevMocks();

    const response = await globalThis.fetch(
      `${DEFAULT_API_URL}/compliance/documents`,
    );
    expect(response.status).toBe(200);
  });

  // Hermes lacks BroadcastChannel and MessageEvent, which msw's core needs.
  it.each([
    "start-dev-mocks.native.ts",
    "mocked-fetch.ts",
    "dev-auth-handlers.ts",
    "dev-compliance-handlers.ts",
  ])("%s does not import msw", (file) => {
    const source = readFileSync(join(__dirname, file), "utf8");
    expect(source).not.toMatch(/from ["']msw/);
  });
});
