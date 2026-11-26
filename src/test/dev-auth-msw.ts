import { http } from "msw";

import { createDevAuthRoutes } from "@/mocks/dev-auth-handlers";

// Para tests de pantalla: las mismas rutas que usa el dev build, como handlers
// de msw. Solo jest las usa; el dev build nunca carga msw.
export function createDevAuthMswHandlers(baseUrl: string) {
  return createDevAuthRoutes(baseUrl).map((route) =>
    http.all(route.url, ({ request }) =>
      request.method === route.method ? route.handle(request) : undefined,
    ),
  );
}
