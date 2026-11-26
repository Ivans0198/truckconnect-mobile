// El servidor "Local API" de docs/openapi.json → servers.
export const DEFAULT_API_URL = "http://localhost:3000";

export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_API_URL;
  return trimmed.replace(/\/+$/, "");
}
