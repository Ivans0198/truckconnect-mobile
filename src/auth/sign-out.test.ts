import { http, HttpResponse } from "msw";

import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { useSessionStore } from "./session-store";
import { signOut } from "./sign-out";
import {
  clearStoredSession,
  readStoredAccount,
  readStoredTokens,
  saveAccount,
  saveTokens,
} from "./token-storage";

const getSession = () => useSessionStore.getState().session;

type LogoutRequest = { authorization: string | null; body: unknown };

function captureLogout(): LogoutRequest[] {
  const requests: LogoutRequest[] = [];
  server.use(
    http.post(apiUrl("/auth/logout"), async ({ request }) => {
      requests.push({
        authorization: request.headers.get("Authorization"),
        body: await request.json(),
      });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return requests;
}

describe("signOut", () => {
  beforeEach(async () => {
    await saveTokens(tokensFixture);
    await saveAccount(driverAccountFixture);
    useSessionStore.getState().signIn();
  });

  it("revokes the session with the Bearer and the refresh token", async () => {
    const requests = captureLogout();

    await signOut();

    expect(requests).toEqual([
      {
        authorization: `Bearer ${tokensFixture.accessToken}`,
        body: { refreshToken: tokensFixture.refreshToken },
      },
    ]);
  });

  it("clears the stored session and leaves the driver signed out", async () => {
    await signOut();

    expect(await readStoredTokens()).toBeNull();
    expect(await readStoredAccount()).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("signs out locally when the back answers with an error", async () => {
    server.use(
      http.post(apiUrl("/auth/logout"), () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    await signOut();

    expect(await readStoredTokens()).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("signs out locally when there is no network", async () => {
    server.use(http.post(apiUrl("/auth/logout"), () => HttpResponse.error()));

    await signOut();

    expect(await readStoredTokens()).toBeNull();
    expect(await readStoredAccount()).toBeNull();
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });

  it("skips the request when nothing is stored and still signs out", async () => {
    const requests = captureLogout();
    await clearStoredSession();

    await signOut();

    expect(requests).toEqual([]);
    expect(getSession()).toEqual({ status: "signedOut", reason: null });
  });
});
