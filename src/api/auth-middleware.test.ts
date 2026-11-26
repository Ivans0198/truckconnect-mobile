import { http, HttpResponse } from "msw";

import { saveTokens } from "@/auth/token-storage";
import { tokensFixture } from "@/test/auth-fixtures";
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
});
