import { authApi } from "@/api/client";

import { endSession } from "./end-session";
import { readStoredTokens } from "./token-storage";

// Avisar al back es una cortesía para que revoque la credencial: el teléfono
// ya decidió cerrar la sesión, así que ni un error ni la falta de red pueden
// dejarla abierta.
async function revokeStoredSession(): Promise<void> {
  const tokens = await readStoredTokens();
  if (!tokens) return;
  try {
    await authApi.POST("/auth/logout", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      body: { refreshToken: tokens.refreshToken },
    });
  } catch {
    // fetch rechaza sin red; la sesión local se borra igual abajo.
  }
}

export async function signOut(): Promise<void> {
  try {
    await revokeStoredSession();
  } finally {
    await endSession(null);
  }
}
