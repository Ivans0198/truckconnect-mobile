import { server } from "@/test/server";

type NodeFetchGlobals = Pick<
  typeof globalThis,
  "fetch" | "Request" | "Response" | "Headers"
>;

// Guardado por tests/jest/environment.js: el fetch de Node, que es el que msw
// sabe interceptar. Tiene que volver antes de server.listen().
const nodeFetch = (globalThis as unknown as { __nodeFetch: NodeFetchGlobals })
  .__nodeFetch;
for (const [name, value] of Object.entries(nodeFetch)) {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
}

// Escucha ya, no en beforeAll: openapi-fetch captura globalThis.fetch al
// crear el cliente, y el cliente se crea al importar el test, antes de
// cualquier beforeAll. Tiene que capturar el fetch que msw ya parcheó.
server.listen({ onUnhandledFrame: "error" });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
