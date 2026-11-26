import { TEST_API_URL } from "@/test/env";
import { server } from "@/test/server";

import { driverAccountFixture } from "./auth-fixtures";
import {
  DEV_DRIVER_EMAIL,
  DEV_DRIVER_PASSWORD,
  createDevAuthHandlers,
} from "./dev-auth-handlers";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const post = (path: string, body: unknown): Promise<Response> =>
  fetch(`${TEST_API_URL}${path}`, json(body));

const get = (path: string, headers?: HeadersInit): Promise<Response> =>
  fetch(`${TEST_API_URL}${path}`, { headers });

async function loginAsDriver(): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const response = await post("/auth/login", {
    email: DEV_DRIVER_EMAIL,
    password: DEV_DRIVER_PASSWORD,
  });
  return response.json();
}

describe("dev auth handlers", () => {
  beforeEach(() => {
    server.use(...createDevAuthHandlers(TEST_API_URL));
  });

  it("uses the shared driver fixture as the test driver", () => {
    expect(DEV_DRIVER_EMAIL).toBe(driverAccountFixture.email);
  });

  it("logs the test driver in with AuthTokens", async () => {
    const response = await post("/auth/login", {
      email: DEV_DRIVER_EMAIL,
      password: DEV_DRIVER_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it.each([
    ["a wrong password", { email: DEV_DRIVER_EMAIL, password: "nope" }],
    [
      "an unknown email",
      { email: "x@truckconnect.test", password: DEV_DRIVER_PASSWORD },
    ],
    [
      "another capitalisation of the email",
      { email: DEV_DRIVER_EMAIL.toUpperCase(), password: DEV_DRIVER_PASSWORD },
    ],
    [
      "an email with spaces around it",
      { email: ` ${DEV_DRIVER_EMAIL} `, password: DEV_DRIVER_PASSWORD },
    ],
  ])("rejects %s with a 401 ApiErrorDto", async (_name, body) => {
    const response = await post("/auth/login", body);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      statusCode: 401,
      message: expect.any(String),
    });
  });

  it("rejects an empty login body with a 400 ApiErrorDto", async () => {
    const response = await post("/auth/login", {});

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ statusCode: 400 });
  });

  it("returns the test driver on /auth/me for a bearer issued by the mock", async () => {
    const { accessToken } = await loginAsDriver();

    const response = await get("/auth/me", {
      Authorization: `Bearer ${accessToken}`,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      role: "DRIVER",
      status: "ACTIVE",
      email: DEV_DRIVER_EMAIL,
    });
  });

  it("answers 401 on /auth/me without a bearer or with a foreign one", async () => {
    expect((await get("/auth/me")).status).toBe(401);
    expect(
      (await get("/auth/me", { Authorization: "Bearer whatever" })).status,
    ).toBe(401);
  });

  it("renews the tokens for a refresh token issued by the mock", async () => {
    const { refreshToken } = await loginAsDriver();

    const response = await post("/auth/refresh", { refreshToken });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it("rejects an unknown refresh token with a 401", async () => {
    const response = await post("/auth/refresh", { refreshToken: "unknown" });

    expect(response.status).toBe(401);
  });

  it("answers 204 on logout", async () => {
    const response = await post("/auth/logout", { refreshToken: "any" });

    expect(response.status).toBe(204);
  });

  it("keeps accepting earlier tokens on a fresh set of handlers (app restart)", async () => {
    const { accessToken, refreshToken } = await loginAsDriver();
    server.use(...createDevAuthHandlers(TEST_API_URL));

    const me = await get("/auth/me", {
      Authorization: `Bearer ${accessToken}`,
    });
    const refreshed = await post("/auth/refresh", { refreshToken });

    expect(me.status).toBe(200);
    expect(refreshed.status).toBe(200);
  });
});
