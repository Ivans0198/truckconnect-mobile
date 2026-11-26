import { http, HttpResponse } from "msw";

import { useSessionStore } from "@/auth/session-store";
import {
  clearStoredSession,
  readStoredTokens,
  saveTokens,
} from "@/auth/token-storage";
import { driverAccountFixture, tokensFixture } from "@/test/auth-fixtures";
import { apiUrl, server } from "@/test/server";

import { api, authApi } from "./client";

// Registra el header Authorization que llegó a cada path.
function recordAuthorization(): Map<string, string | null> {
  const seen = new Map<string, string | null>();
  const record =
    (path: string) =>
    ({ request }: { request: Request }) => {
      seen.set(path, request.headers.get("authorization"));
      return HttpResponse.json(tokensFixture);
    };
  server.use(
    http.get(apiUrl("/auth/me"), record("/auth/me")),
    http.post(apiUrl("/auth/login"), record("/auth/login")),
    http.post(apiUrl("/auth/refresh"), record("/auth/refresh")),
  );
  return seen;
}

describe("auth middleware", () => {
  it("adds the Bearer access token to requests when there is a session", async () => {
    await saveTokens(tokensFixture);
    const seen = recordAuthorization();

    await api.GET("/auth/me");

    expect(seen.get("/auth/me")).toBe(`Bearer ${tokensFixture.accessToken}`);
  });

  it("sends no Authorization header without a session", async () => {
    const seen = recordAuthorization();

    await api.GET("/auth/me");

    expect(seen.get("/auth/me")).toBeNull();
  });

  it("never sends the Bearer to POST /auth/login, even with a session", async () => {
    await saveTokens(tokensFixture);
    const seen = recordAuthorization();

    await api.POST("/auth/login", { body: { email: "a@b.c", password: "x" } });

    expect(seen.get("/auth/login")).toBeNull();
  });

  it("never sends the Bearer to POST /auth/refresh, through either client", async () => {
    await saveTokens(tokensFixture);
    const seen = recordAuthorization();
    const body = { refreshToken: tokensFixture.refreshToken };

    await api.POST("/auth/refresh", { body });
    expect(seen.get("/auth/refresh")).toBeNull();

    seen.clear();
    await authApi.POST("/auth/refresh", { body });
    expect(seen.get("/auth/refresh")).toBeNull();
  });

  describe("when the access token has expired", () => {
    const renewedTokens = {
      accessToken: "access-token-2",
      refreshToken: "refresh-token-2",
    };

    // /auth/me contesta 401 con el token viejo y 200 con el nuevo.
    function expireOldAccessToken(): { refreshCalls: () => number } {
      let refreshCalls = 0;
      server.use(
        http.get(apiUrl("/auth/me"), ({ request }) =>
          request.headers.get("authorization") ===
          `Bearer ${renewedTokens.accessToken}`
            ? HttpResponse.json(driverAccountFixture)
            : HttpResponse.json({}, { status: 401 }),
        ),
        http.post(apiUrl("/auth/refresh"), () => {
          refreshCalls += 1;
          return HttpResponse.json(renewedTokens);
        }),
      );
      return { refreshCalls: () => refreshCalls };
    }

    beforeEach(async () => {
      await saveTokens(tokensFixture);
      useSessionStore.getState().signIn();
    });

    it("renews the session and repeats the request once with the new token", async () => {
      const { refreshCalls } = expireOldAccessToken();

      const { data, response } = await api.GET("/auth/me");

      expect(response.status).toBe(200);
      expect(data).toEqual(driverAccountFixture);
      expect(refreshCalls()).toBe(1);
      expect(await readStoredTokens()).toEqual(renewedTokens);
    });

    it("repeats a request that has a body", async () => {
      let received: unknown;
      server.use(
        http.post(apiUrl("/auth/logout"), async ({ request }) => {
          if (
            request.headers.get("authorization") === "Bearer access-token-2"
          ) {
            received = await request.json();
            return new HttpResponse(null, { status: 204 });
          }
          return HttpResponse.json({}, { status: 401 });
        }),
        http.post(apiUrl("/auth/refresh"), () =>
          HttpResponse.json(renewedTokens),
        ),
      );

      const { response } = await api.POST("/auth/logout", {
        body: { refreshToken: "refresh-token-1" },
      });

      expect(response.status).toBe(204);
      expect(received).toEqual({ refreshToken: "refresh-token-1" });
    });

    it("makes a single refresh for three simultaneous 401s and completes all three", async () => {
      const { refreshCalls } = expireOldAccessToken();

      const results = await Promise.all([
        api.GET("/auth/me"),
        api.GET("/auth/me"),
        api.GET("/auth/me"),
      ]);

      expect(refreshCalls()).toBe(1);
      expect(results.map((r) => r.response.status)).toEqual([200, 200, 200]);
    });

    it("signs out as expired and clears the stored session when the refresh is rejected", async () => {
      server.use(
        http.get(apiUrl("/auth/me"), () =>
          HttpResponse.json({}, { status: 401 }),
        ),
        http.post(apiUrl("/auth/refresh"), () =>
          HttpResponse.json({}, { status: 401 }),
        ),
      );

      const { response } = await api.GET("/auth/me");

      expect(response.status).toBe(401);
      expect(useSessionStore.getState().session).toEqual({
        status: "signedOut",
        reason: "expired",
      });
      expect(await readStoredTokens()).toBeNull();
    });

    it.each([429, 500])(
      "keeps the driver in and returns the original 401 when the refresh answers %s",
      async (status) => {
        server.use(
          http.get(apiUrl("/auth/me"), () =>
            HttpResponse.json({}, { status: 401 }),
          ),
          http.post(apiUrl("/auth/refresh"), () =>
            HttpResponse.json({}, { status }),
          ),
        );

        const { response } = await api.GET("/auth/me");

        expect(response.status).toBe(401);
        expect(useSessionStore.getState().session).toEqual({
          status: "signedIn",
        });
        expect(await readStoredTokens()).toEqual(tokensFixture);
      },
    );

    it("keeps the driver in when the refresh cannot reach the network", async () => {
      server.use(
        http.get(apiUrl("/auth/me"), () =>
          HttpResponse.json({}, { status: 401 }),
        ),
        http.post(apiUrl("/auth/refresh"), () => HttpResponse.error()),
      );

      const { response } = await api.GET("/auth/me");

      expect(response.status).toBe(401);
      expect(useSessionStore.getState().session).toEqual({
        status: "signedIn",
      });
    });

    it("does not refresh on a 401 from /auth/login", async () => {
      let refreshCalls = 0;
      server.use(
        http.post(apiUrl("/auth/login"), () =>
          HttpResponse.json({}, { status: 401 }),
        ),
        http.post(apiUrl("/auth/refresh"), () => {
          refreshCalls += 1;
          return HttpResponse.json(renewedTokens);
        }),
      );

      const { response } = await api.POST("/auth/login", {
        body: { email: "a@b.c", password: "x" },
      });

      expect(response.status).toBe(401);
      expect(refreshCalls).toBe(0);
    });

    it("does not refresh when there is no stored session", async () => {
      await clearStoredSession();
      let refreshCalls = 0;
      server.use(
        http.get(apiUrl("/auth/me"), () =>
          HttpResponse.json({}, { status: 401 }),
        ),
        http.post(apiUrl("/auth/refresh"), () => {
          refreshCalls += 1;
          return HttpResponse.json(renewedTokens);
        }),
      );

      const { response } = await api.GET("/auth/me");

      expect(response.status).toBe(401);
      expect(refreshCalls).toBe(0);
    });

    it("repeats with the stored token, without refreshing, when another request already renewed it", async () => {
      let refreshCalls = 0;
      server.use(
        http.get(apiUrl("/auth/me"), async ({ request }) => {
          if (
            request.headers.get("authorization") ===
            `Bearer ${renewedTokens.accessToken}`
          ) {
            return HttpResponse.json(driverAccountFixture);
          }
          // Mientras este pedido volaba con el token viejo, otro ya renovó.
          await saveTokens(renewedTokens);
          return HttpResponse.json({}, { status: 401 });
        }),
        http.post(apiUrl("/auth/refresh"), () => {
          refreshCalls += 1;
          return HttpResponse.json(renewedTokens);
        }),
      );

      const { response } = await api.GET("/auth/me");

      expect(response.status).toBe(200);
      expect(refreshCalls).toBe(0);
    });
  });
});
