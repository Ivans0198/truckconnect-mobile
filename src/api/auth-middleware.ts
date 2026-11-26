import type { Middleware } from "openapi-fetch";

import { endSession } from "@/auth/end-session";
import { refreshSession } from "@/auth/refresh-session";
import { readStoredTokens } from "@/auth/token-storage";

// Estos dos paths nunca llevan Bearer: no hay sesión todavía, o es justo la
// credencial de renovación la que viaja en el body.
const PATHS_WITHOUT_BEARER: readonly string[] = [
  "/auth/login",
  "/auth/refresh",
];

const HTTP_UNAUTHORIZED = 401;

// El body de un request se consume al enviarlo: para repetirlo hay que haber
// guardado un clon antes. Se borra cuando llega la respuesta.
const pendingClones = new Map<string, Request>();

function bearerOf(request: Request): string | null {
  return request.headers.get("Authorization");
}

// Devuelve el access token con el que repetir el pedido, o null si no hay
// que repetirlo (la renovación falló o la sesión terminó).
async function accessTokenForRetry(
  sentWith: string | null,
): Promise<string | null> {
  const stored = await readStoredTokens();
  if (!stored) return null;
  // Otro pedido ya renovó mientras este volaba: basta el token guardado.
  if (sentWith !== `Bearer ${stored.accessToken}`) return stored.accessToken;

  const outcome = await refreshSession();
  if (outcome.kind === "renewed") return outcome.tokens.accessToken;
  if (outcome.kind === "rejected") await endSession("expired");
  return null;
}

export const authMiddleware: Middleware = {
  async onRequest({ request, schemaPath, id }) {
    // Un 401 de login o de renovación no se repara renovando.
    if (PATHS_WITHOUT_BEARER.includes(schemaPath)) return request;
    const tokens = await readStoredTokens();
    if (tokens) {
      request.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }
    pendingClones.set(id, request.clone());
    return request;
  },

  async onResponse({ request, response, id, options }) {
    const clone = pendingClones.get(id);
    pendingClones.delete(id);
    if (response.status !== HTTP_UNAUTHORIZED || !clone) return undefined;

    const accessToken = await accessTokenForRetry(bearerOf(request));
    // Sin token nuevo, el pedido devuelve su 401 y la pantalla muestra su error.
    if (!accessToken) return undefined;

    clone.headers.set("Authorization", `Bearer ${accessToken}`);
    return options.fetch(clone);
  },

  // Sin red fetch rechaza y onResponse nunca corre: el clon se suelta aquí.
  onError({ id }) {
    pendingClones.delete(id);
  },
};
