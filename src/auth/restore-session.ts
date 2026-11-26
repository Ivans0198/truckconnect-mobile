import { queryClient } from "@/api/query-client";

import { endSession } from "./end-session";
import { useSessionStore } from "./session-store";
import { readStoredAccount, readStoredTokens } from "./token-storage";
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

export async function restoreSession(): Promise<void> {
  const tokens = await readStoredTokens();
  if (!tokens) {
    useSessionStore.getState().finishRestoring({ hasTokens: false });
    return;
  }

  const account = await readStoredAccount();
  if (account) queryClient.setQueryData(CURRENT_ACCOUNT_KEY, account);
  useSessionStore.getState().finishRestoring({ hasTokens: true });
  void validateAccountInBackground();
}
