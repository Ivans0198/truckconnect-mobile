import { DEFAULT_API_URL } from "@/api/config";

import { createDevAuthRoutes } from "./dev-auth-handlers";
import { createDevComplianceRoutes } from "./dev-compliance-handlers";
import { createMockedFetch } from "./mocked-fetch";

// Sustituye el fetch global por uno que responde con los handlers de
// desarrollo. Se llama una vez, desde index.js, antes de cargar el router.
export function startDevMocks(): void {
  globalThis.fetch = createMockedFetch({
    routes: [
      ...createDevAuthRoutes(DEFAULT_API_URL),
      ...createDevComplianceRoutes(DEFAULT_API_URL, () => new Date()),
    ],
    realFetch: globalThis.fetch,
    baseUrl: DEFAULT_API_URL,
  });
  console.info(
    `[mocks] EXPO_PUBLIC_API_URL is not set: answering ${DEFAULT_API_URL} from src/mocks`,
  );
}
