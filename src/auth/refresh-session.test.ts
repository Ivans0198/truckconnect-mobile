import { http, HttpResponse } from "msw";

import { tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { refreshSession } from "./refresh-session";
import {
  clearStoredSession,
  readStoredTokens,
  saveTokens,
} from "./token-storage";

const renewedTokens = {
  accessToken: "access-token-2",
  refreshToken: "refresh-token-2",
};

describe("refreshSession", () => {
  beforeEach(() => saveTokens(tokensFixture));

  it("returns renewed and stores the new pair on 200", async () => {
    server.use(
      http.post(apiUrl("/auth/refresh"), () =>
        HttpResponse.json(renewedTokens),
      ),
    );

    const outcome = await refreshSession();

    expect(outcome).toEqual({ kind: "renewed", tokens: renewedTokens });
    expect(await readStoredTokens()).toEqual(renewedTokens);
  });

  it("sends the stored refresh token in the body", async () => {
    let body: unknown;
    server.use(
      http.post(apiUrl("/auth/refresh"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(renewedTokens);
      }),
    );

    await refreshSession();

    expect(body).toEqual({ refreshToken: tokensFixture.refreshToken });
  });

  it("returns rejected on 401", async () => {
    server.use(
      http.post(apiUrl("/auth/refresh"), () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );

    expect(await refreshSession()).toEqual({ kind: "rejected" });
  });

  it.each([429, 500, 503])(
    "returns unreachable on %s and leaves the session alone",
    async (status) => {
      server.use(
        http.post(apiUrl("/auth/refresh"), () =>
          HttpResponse.json({}, { status }),
        ),
      );

      expect(await refreshSession()).toEqual({ kind: "unreachable" });
      expect(await readStoredTokens()).toEqual(tokensFixture);
    },
  );

  it("returns unreachable when the network is down", async () => {
    server.use(http.post(apiUrl("/auth/refresh"), () => HttpResponse.error()));

    expect(await refreshSession()).toEqual({ kind: "unreachable" });
    expect(await readStoredTokens()).toEqual(tokensFixture);
  });

  it("returns rejected when there is no stored session", async () => {
    await clearStoredSession();

    expect(await refreshSession()).toEqual({ kind: "rejected" });
  });

  it("makes a single POST /auth/refresh for simultaneous calls", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl("/auth/refresh"), () => {
        calls += 1;
        return HttpResponse.json(renewedTokens);
      }),
    );

    const outcomes = await Promise.all([
      refreshSession(),
      refreshSession(),
      refreshSession(),
    ]);

    expect(calls).toBe(1);
    for (const outcome of outcomes) {
      expect(outcome).toEqual({ kind: "renewed", tokens: renewedTokens });
    }
  });

  it("starts a new refresh once the previous one has finished", async () => {
    let calls = 0;
    server.use(
      http.post(apiUrl("/auth/refresh"), () => {
        calls += 1;
        return HttpResponse.json(renewedTokens);
      }),
    );

    await refreshSession();
    await refreshSession();

    expect(calls).toBe(2);
  });
});
