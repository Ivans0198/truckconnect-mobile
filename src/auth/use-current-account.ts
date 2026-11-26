import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { api } from "@/api/client";

import { saveAccount } from "./token-storage";
import type { Account } from "./types";

export const CURRENT_ACCOUNT_KEY = ["auth", "me"] as const;

// Lanza ante un no-2xx, como toda query de la app. Cada 200 se vuelve a
// guardar: es la copia con la que la app arranca la próxima vez sin red.
export async function fetchCurrentAccount(): Promise<Account> {
  const { data, response } = await api.GET("/auth/me");
  if (!data) throw new Error(`GET /auth/me failed with ${response.status}`);
  await saveAccount(data);
  return data;
}

// La cuenta guardada llega ya en la caché: restoreSession la siembra antes de
// que arranque la UI, porque initialData tiene que ser síncrono.
export function useCurrentAccount(): UseQueryResult<Account> {
  return useQuery({
    queryKey: CURRENT_ACCOUNT_KEY,
    queryFn: fetchCurrentAccount,
  });
}
