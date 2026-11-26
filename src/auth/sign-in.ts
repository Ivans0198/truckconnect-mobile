import { authApi } from "@/api/client";

import { useSessionStore } from "./session-store";
import { saveAccount, saveTokens } from "./token-storage";
import type { Account, AuthTokens } from "./types";

export type SignInError =
  "invalidCredentials" | "rateLimited" | "unreachable" | "notDriver";

export type SignInResult =
  { kind: "signedIn" } | { kind: "error"; error: SignInError };

type Credentials = { email: string; password: string };

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;

const fail = (error: SignInError): SignInResult => ({ kind: "error", error });

// Un 400 solo llega con un email mal formado: para el conductor es lo mismo
// que credenciales incorrectas (research R5).
function errorForStatus(status: number): SignInError {
  if (status === HTTP_BAD_REQUEST || status === HTTP_UNAUTHORIZED) {
    return "invalidCredentials";
  }
  if (status === HTTP_TOO_MANY_REQUESTS) return "rateLimited";
  return "unreachable";
}

const bearer = (tokens: AuthTokens): { Authorization: string } => ({
  Authorization: `Bearer ${tokens.accessToken}`,
});

// Revocar la credencial de una cuenta que la app no va a usar es cortesía:
// si falla, el resultado para el conductor es el mismo.
async function revokeCredential(tokens: AuthTokens): Promise<void> {
  try {
    await authApi.POST("/auth/logout", {
      headers: bearer(tokens),
      body: { refreshToken: tokens.refreshToken },
    });
  } catch {
    // Sin red no hay nada más que hacer; no se guardó nada que limpiar.
  }
}

async function requestTokens(
  credentials: Credentials,
): Promise<{ tokens: AuthTokens } | { error: SignInError }> {
  const { data, response } = await authApi.POST("/auth/login", {
    body: credentials,
  });
  return data ? { tokens: data } : { error: errorForStatus(response.status) };
}

// Se pide con el token recién recibido y sin middleware: todavía no hay nada
// guardado, y un rol ajeno nunca debe dejar nada guardado.
async function requestAccount(
  tokens: AuthTokens,
): Promise<Account | undefined> {
  const { data } = await authApi.GET("/auth/me", { headers: bearer(tokens) });
  return data;
}

async function signInWith(credentials: Credentials): Promise<SignInResult> {
  const login = await requestTokens(credentials);
  if ("error" in login) return fail(login.error);

  const account = await requestAccount(login.tokens);
  if (!account) return fail("unreachable");

  if (account.role !== "DRIVER") {
    await revokeCredential(login.tokens);
    return fail("notDriver");
  }
  if (account.status !== "ACTIVE") {
    await revokeCredential(login.tokens);
    return fail("invalidCredentials");
  }

  await saveTokens(login.tokens);
  await saveAccount(account);
  useSessionStore.getState().signIn();
  return { kind: "signedIn" };
}

export async function signIn({
  email,
  password,
}: Credentials): Promise<SignInResult> {
  try {
    return await signInWith({ email: email.trim(), password });
  } catch {
    // fetch rechaza cuando no hay red; la app sigue abierta y ofrece reintentar.
    return fail("unreachable");
  }
}
