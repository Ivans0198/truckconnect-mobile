import { getResponse, type RequestHandler } from "msw";

type FetchFunction = typeof globalThis.fetch;

type MockedFetchOptions = {
  handlers: RequestHandler[];
  realFetch: FetchFunction;
  baseUrl: string;
};

// msw 3 ya no trae `msw/native`, y `msw/node` importa módulos de Node que
// Metro no resuelve. Se usa solo el núcleo (getResponse) detrás de un fetch
// propio. openapi-fetch captura globalThis.fetch al crear el cliente, así que
// este tiene que instalarse antes de importar src/api/client.ts.
export function createMockedFetch({
  handlers,
  realFetch,
  baseUrl,
}: MockedFetchOptions): FetchFunction {
  return async (input, init) => {
    const request = new Request(input, init);
    if (!request.url.startsWith(baseUrl)) return realFetch(input, init);

    const response = await getResponse(handlers, request);
    if (!response) {
      throw new Error(
        `No mock handler for ${request.method} ${request.url}. Add one in src/mocks or set EXPO_PUBLIC_API_URL to use a real back.`,
      );
    }
    return response;
  };
}
