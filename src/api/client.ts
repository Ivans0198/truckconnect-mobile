import createClient from "openapi-fetch";

import { resolveApiBaseUrl } from "./config";
import type { paths } from "./schema";

// Tipado desde docs/openapi.json (pnpm gen:api). Si un path o campo no está
// en el contrato, no compila.
export const api = createClient<paths>({
  baseUrl: resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL),
});
