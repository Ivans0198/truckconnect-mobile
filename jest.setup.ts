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

// expo-secure-store es nativo: en jest se reemplaza por un Map en memoria que
// se vacía entre tests, para que ninguno herede la sesión de otro.
const mockSecureStoreItems = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStoreItems.get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreItems.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreItems.delete(key);
  }),
}));
afterEach(() => mockSecureStoreItems.clear());

// Sin SafeAreaProvider el hook falla; los tests no miden insets, así que
// basta el mock que trae la librería.
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
