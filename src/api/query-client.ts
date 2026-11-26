import { QueryClient } from "@tanstack/react-query";

// Único para toda la app: endSession tiene que poder vaciar su caché.
export const queryClient = new QueryClient();
