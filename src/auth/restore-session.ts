import { queryClient } from "@/api/query-client";

import { endSession } from "./end-session";
import { useSessionStore } from "./session-store";
import {
  clearStoredSession,
  readStoredAccount,
  readStoredTokens,
} from "./token-storage";
import type { Account } from "./types";
import {
  CURRENT_ACCOUNT_KEY,
  fetchCurrentAccount,
} from "./use-current-account";

// Con la cuenta ya guardada no hace falta red para entrar; el back solo puede
// sacar al conductor si dice que ya no es un conductor activo.
async function validateAccountInBackground(): Promise<void> {
  try {
    const account = await queryClient.fetchQuery({
      queryKey: CURRENT_ACCOUNT_KEY,
      queryFn: fetchCurrentAccount,
      staleTime: 0,
    });
    if (account.role !== "DRIVER" || account.status !== "ACTIVE") {
      await endSession("inactive");
    }
  } catch {
    // Sin red, un 5xx o un 429 no prueban nada sobre la cuenta: el conductor
    // sigue dentro con lo guardado. Un 401 ya lo maneja el middleware.
  }
}

type StoredSession = { hasTokens: boolean; account: Account | null };

// Un valor corrupto o un error del keystore no debe dejar la splash para
// siempre: lo guardado deja de servir, se borra y el conductor ve el login.
async function readStoredSession(): Promise<StoredSession> {
  try {
    const tokens = await readStoredTokens();
    if (!tokens) return { hasTokens: false, account: null };
    return { hasTokens: true, account: await readStoredAccount() };
  } catch {
    await clearStoredSession();
    return { hasTokens: false, account: null };
  }
}

export async function restoreSession(): Promise<void> {
  const { hasTokens, account } = await readStoredSession();
  if (account) queryClient.setQueryData(CURRENT_ACCOUNT_KEY, account);
  useSessionStore.getState().finishRestoring({ hasTokens });
  if (hasTokens) void validateAccountInBackground();
}
