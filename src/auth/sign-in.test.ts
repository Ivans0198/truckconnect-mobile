import { http, HttpResponse } from "msw";

import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { useSessionStore } from "./session-store";
import { signIn } from "./sign-in";
import { readStoredAccount, readStoredTokens } from "./token-storage";

const credentials = { email: "driver@truckconnect.test", password: "secret" };

const initialState = useSessionStore.getState();
const getSession = () => useSessionStore.getState().session;

const meReturns = (account: object) =>
  server.use(http.get(apiUrl("/auth/me"), () => HttpResponse.json(account)));

describe("signIn", () => {
  beforeEach(() => {
    useSessionStore.setState(initialState, true);
    useSessionStore.getState().finishRestoring({ hasTokens: false });
  });

  it("stores the tokens and the account and signs in an active driver", async () => {
    const result = await signIn(credentials);

    expect(result).toEqual({ kind: "signedIn" });
    expect(await readStoredTokens()).toEqual(tokensFixture);
    expect(await readStoredAccount()).toEqual(driverAccountFixture);
    expect(getSession()).toEqual({ status: "signedIn" });
  });

  it("sends the email trimmed", async () => {
    let sentBody: unknown;
    server.use(
      http.post(apiUrl("/auth/login"), async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(tokensFixture);
      }),
    );

    await signIn({
      email: "  driver@truckconnect.test \n",
      password: "secret",
    });

    expect(sentBody).toEqual(credentials);
  });

  it("asks for the account with the new access token", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(apiUrl("/auth/me"), ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json(driverAccountFixture);
      }),
    );

    await signIn(credentials);

    expect(authorization).toBe(`Bearer ${tokensFixture.accessToken}`);
  });

  it.each(["ADMIN", "CLIENT"])(
    "rejects a %s account, revokes the credential and stores nothing",
    async (role) => {
      meReturns({ ...driverAccountFixture, role });
      let logoutBody: unknown;
      server.use(
        http.post(apiUrl("/auth/logout"), async ({ request }) => {
          logoutBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await signIn(credentials);

      expect(result).toEqual({ kind: "error", error: "notDriver" });
      expect(logoutBody).toEqual({ refreshToken: tokensFixture.refreshToken });
      expect(await readStoredTokens()).toBeNull();
      expect(await readStoredAccount()).toBeNull();
      expect(getSession()).toEqual({ status: "signedOut", reason: null });
    },
  );

  it("still reports notDriver when the courtesy logout fails", async () => {
    meReturns({ ...driverAccountFixture, role: "ADMIN" });
    server.use(http.post(apiUrl("/auth/logout"), () => HttpResponse.error()));

    const result = await signIn(credentials);

    expect(result).toEqual({ kind: "error", error: "notDriver" });
    expect(await readStoredTokens()).toBeNull();
  });

  it("does not let in a driver whose account is not active", async () => {
    meReturns({ ...driverAccountFixture, status: "SUSPENDED" });

    const result = await signIn(credentials);

    expect(result).toEqual({ kind: "error", error: "invalidCredentials" });
    expect(await readStoredTokens()).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it.each([
    [400, "invalidCredentials"],
    [401, "invalidCredentials"],
    [429, "rateLimited"],
    [500, "unreachable"],
    [503, "unreachable"],
  ])("maps a %i from the login to %s", async (status, error) => {
    server.use(
      http.post(apiUrl("/auth/login"), () =>
        HttpResponse.json({ message: "no" }, { status }),
      ),
    );

    const result = await signIn(credentials);

    expect(result).toEqual({ kind: "error", error });
    expect(await readStoredTokens()).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("maps a network failure on the login to unreachable", async () => {
    server.use(http.post(apiUrl("/auth/login"), () => HttpResponse.error()));

    expect(await signIn(credentials)).toEqual({
      kind: "error",
      error: "unreachable",
    });
  });

  it("maps a failing /auth/me to unreachable and stores nothing", async () => {
    server.use(http.get(apiUrl("/auth/me"), () => HttpResponse.error()));

    expect(await signIn(credentials)).toEqual({
      kind: "error",
      error: "unreachable",
    });
    expect(await readStoredTokens()).toBeNull();
  });
});
