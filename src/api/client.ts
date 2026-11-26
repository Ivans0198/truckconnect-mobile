import createClient from "openapi-fetch";

import { authMiddleware } from "./auth-middleware";
import { resolveApiBaseUrl } from "./config";
import type { paths } from "./schema";

const baseUrl = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);

// Tipado desde docs/openapi.json (pnpm gen:api). Si un path o campo no está
// en el contrato, no compila.
export const api = createClient<paths>({ baseUrl });
api.use(authMiddleware);

// Sin middleware: la renovación sale por aquí para que su propio 401 no
// dispare otra renovación.
export const authApi = createClient<paths>({ baseUrl });
