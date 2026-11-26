type StartDecision = { isDev: boolean; apiUrl: string | undefined };

// Definir EXPO_PUBLIC_API_URL significa "tengo back real". Una URL vacía o de
// solo espacios cuenta como no definida, igual que en resolveApiBaseUrl.
export function shouldStartDevMocks({ isDev, apiUrl }: StartDecision): boolean {
  return isDev && !apiUrl?.trim();
}
