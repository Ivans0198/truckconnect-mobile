import { queryClient } from "@/api/query-client";

import { useSessionStore } from "./session-store";
import { clearStoredSession } from "./token-storage";
import type { SignOutReason } from "./types";

// Primero se borra lo guardado y la caché, y recién después cambia el estado:
// el guard saca al conductor del área interna sin que quede nada suyo detrás.
export async function endSession(reason: SignOutReason | null): Promise<void> {
  await clearStoredSession();
  queryClient.clear();
  useSessionStore.getState().signOut(reason);
}
