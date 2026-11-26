// Entry propio: los mocks de desarrollo tienen que estar listos antes de que
// se importe src/api/client.ts, y los imports de ES se elevan. Por eso todo
// va con require, y el bloque __DEV__ lo elimina Metro del bundle de producción.
if (__DEV__) {
  const { shouldStartDevMocks } = require("./src/mocks/should-start-dev-mocks");
  if (
    shouldStartDevMocks({
      isDev: __DEV__,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    })
  ) {
    require("./src/mocks/start-dev-mocks").startDevMocks();
  }
}

require("expo-router/entry");
