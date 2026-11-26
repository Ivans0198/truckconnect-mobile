import type { DevRoute } from "./dev-auth-handlers";
import { createMockedFetch } from "./mocked-fetch";

const BASE_URL = "http://localhost:3000";

const routes: DevRoute[] = [
  {
    method: "GET",
    url: `${BASE_URL}/ping`,
    handle: () => new Response(JSON.stringify({ pong: true })),
  },
];

describe("createMockedFetch", () => {
  it("answers an API request from the handlers", async () => {
    const realFetch = jest.fn();
    const mocked = createMockedFetch({
      routes,
      realFetch,
      baseUrl: BASE_URL,
    });

    const response = await mocked(new Request(`${BASE_URL}/ping`));

    expect(await response.json()).toEqual({ pong: true });
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("accepts a URL string and init like fetch does", async () => {
    const mocked = createMockedFetch({
      routes,
      realFetch: jest.fn(),
      baseUrl: BASE_URL,
    });

    const response = await mocked(`${BASE_URL}/ping`, { method: "GET" });

    expect(response.status).toBe(200);
  });

  it("fails loudly on an API request without a handler", async () => {
    const realFetch = jest.fn();
    const mocked = createMockedFetch({
      routes,
      realFetch,
      baseUrl: BASE_URL,
    });

    await expect(mocked(`${BASE_URL}/other`)).rejects.toThrow(
      /no mock handler for GET http:\/\/localhost:3000\/other/i,
    );
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("lets requests to other hosts (Metro, assets) through to the real fetch", async () => {
    const realFetch = jest.fn().mockResolvedValue(new Response("bundle"));
    const mocked = createMockedFetch({
      routes,
      realFetch,
      baseUrl: BASE_URL,
    });

    const response = await mocked("http://localhost:8081/index.bundle");

    expect(await response.text()).toBe("bundle");
    expect(realFetch).toHaveBeenCalledWith(
      "http://localhost:8081/index.bundle",
      undefined,
    );
  });
});
