import * as SecureStore from "expo-secure-store";

import type { Account, AuthTokens } from "./types";

// Una sola key para el par: así nunca queda guardada una mitad (data-model.md).
export const SESSION_STORAGE_KEY = "truckconnect.session";
export const ACCOUNT_STORAGE_KEY = "truckconnect.account";

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

export function readStoredTokens(): Promise<AuthTokens | null> {
  return readJson<AuthTokens>(SESSION_STORAGE_KEY);
}

export function readStoredAccount(): Promise<Account | null> {
  return readJson<Account>(ACCOUNT_STORAGE_KEY);
}

export function saveTokens(tokens: AuthTokens): Promise<void> {
  return SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(tokens));
}

export function saveAccount(account: Account): Promise<void> {
  return SecureStore.setItemAsync(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_STORAGE_KEY),
    SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY),
  ]);
}
