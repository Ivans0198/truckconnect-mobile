import { DEFAULT_API_URL } from "@/api/config";

import { createDevAuthHandlers } from "./dev-auth-handlers";
import { createMockedFetch } from "./mocked-fetch";

// Sustituye el fetch global por uno que responde con los handlers de
// desarrollo. Se llama una vez, desde index.js, antes de cargar el router.
export function startDevMocks(): void {
  globalThis.fetch = createMockedFetch({
    handlers: createDevAuthHandlers(DEFAULT_API_URL),
    realFetch: globalThis.fetch,
    baseUrl: DEFAULT_API_URL,
  });
  console.info(
    `[mocks] EXPO_PUBLIC_API_URL is not set: answering ${DEFAULT_API_URL} from src/mocks`,
  );
}
