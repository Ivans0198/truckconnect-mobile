import { authApi } from "@/api/client";

import { readStoredTokens, saveTokens } from "./token-storage";
import type { AuthTokens } from "./types";

export type RefreshOutcome =
  | { kind: "renewed"; tokens: AuthTokens }
  | { kind: "rejected" }
  | { kind: "unreachable" };

const HTTP_UNAUTHORIZED = 401;

const REJECTED: RefreshOutcome = { kind: "rejected" };
const UNREACHABLE: RefreshOutcome = { kind: "unreachable" };

async function requestRenewal(): Promise<RefreshOutcome> {
  const stored = await readStoredTokens();
  if (!stored) return REJECTED;

  try {
    const { data, response } = await authApi.POST("/auth/refresh", {
      body: { refreshToken: stored.refreshToken },
    });
    if (data) {
      // El back rota la credencial de renovación: se guarda el par completo.
      await saveTokens(data);
      return { kind: "renewed", tokens: data };
    }
    // Solo un 401 prueba que la sesión murió; 429 y 5xx son del back, no de ella.
    return response.status === HTTP_UNAUTHORIZED ? REJECTED : UNREACHABLE;
  } catch {
    // fetch rechaza sin red: la sesión sigue buena, solo no se pudo renovar.
    return UNREACHABLE;
  }
}

let renewalInFlight: Promise<RefreshOutcome> | null = null;

// Single-flight: la credencial rota en cada uso, así que dos renovaciones
// simultáneas harían fallar a la segunda. Todos comparten una promesa.
export function refreshSession(): Promise<RefreshOutcome> {
  renewalInFlight ??= requestRenewal().finally(() => {
    renewalInFlight = null;
  });
  return renewalInFlight;
}
