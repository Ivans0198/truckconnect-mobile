import type { Middleware } from "openapi-fetch";

import { readStoredTokens } from "@/auth/token-storage";

// Estos dos paths nunca llevan Bearer: no hay sesión todavía, o es justo la
// credencial de renovación la que viaja en el body.
const PATHS_WITHOUT_BEARER: readonly string[] = [
  "/auth/login",
  "/auth/refresh",
];

export const authMiddleware: Middleware = {
  async onRequest({ request, schemaPath }) {
    if (PATHS_WITHOUT_BEARER.includes(schemaPath)) return request;
    const tokens = await readStoredTokens();
    if (tokens) {
      request.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }
    return request;
  },
};
