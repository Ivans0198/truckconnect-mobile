import type { DevRoute } from "./dev-auth-handlers";

type FetchFunction = typeof globalThis.fetch;

type MockedFetchOptions = {
  routes: DevRoute[];
  realFetch: FetchFunction;
  baseUrl: string;
};

// Un fetch propio sin dependencias del navegador, para Hermes. openapi-fetch
// captura globalThis.fetch al crear el cliente, así que este tiene que
// instalarse antes de importar src/api/client.ts.
export function createMockedFetch({
  routes,
  realFetch,
  baseUrl,
}: MockedFetchOptions): FetchFunction {
  return async (input, init) => {
    const request = new Request(input, init);
    if (!request.url.startsWith(baseUrl)) return realFetch(input, init);

    const { origin, pathname } = new URL(request.url);
    const requested = `${origin}${pathname}`;
    const route = routes.find(
      (candidate) =>
        candidate.method === request.method.toUpperCase() &&
        (typeof candidate.url === "string"
          ? candidate.url === requested
          : candidate.url.test(requested)),
    );
    if (!route) {
      throw new Error(
        `No mock handler for ${request.method} ${request.url}. Add one in src/mocks or set EXPO_PUBLIC_API_URL to use a real back.`,
      );
    }
    return route.handle(request);
  };
}
