import { DEFAULT_API_URL } from "@/api/config";

import { DEV_DRIVER_EMAIL, DEV_DRIVER_PASSWORD } from "./dev-auth-handlers";

// Hermes no trae MessageEvent y el núcleo de msw lo toca al cargarse. En jest
// sí existe (Node), así que el test lo quita del global antes de importar.
describe("startDevMocks without MessageEvent (Hermes)", () => {
  const original = globalThis.MessageEvent;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.MessageEvent = original;
    globalThis.fetch = originalFetch;
  });

  it("loads the mocks and answers a login", async () => {
    // @ts-expect-error simulating a runtime that lacks the global
    delete globalThis.MessageEvent;
    expect(typeof globalThis.MessageEvent).toBe("undefined");

    jest.isolateModules(() => {
      const { startDevMocks } = jest.requireActual<
        typeof import("./start-dev-mocks.native")
      >("./start-dev-mocks.native");
      startDevMocks();
    });

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
});
