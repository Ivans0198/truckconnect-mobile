import type { Account, AuthTokens } from "./types";

// Expo web no tiene secure store. Playwright y el ui-reviewer solo necesitan
// que la app arranque, y la sesión en memoria muere con la pestaña a propósito:
// nada de tokens en localStorage.
export const SESSION_STORAGE_KEY = "truckconnect.session";
export const ACCOUNT_STORAGE_KEY = "truckconnect.account";

let tokens: AuthTokens | null = null;
let account: Account | null = null;

export async function readStoredTokens(): Promise<AuthTokens | null> {
  return tokens;
}

export async function readStoredAccount(): Promise<Account | null> {
  return account;
}

export async function saveTokens(next: AuthTokens): Promise<void> {
  tokens = next;
}

export async function saveAccount(next: Account): Promise<void> {
  account = next;
}

export async function clearStoredSession(): Promise<void> {
  tokens = null;
  account = null;
}
