// Corre antes de cargar cualquier módulo: el cliente lee la URL al importarse.
export const TEST_API_URL = "http://api.test";
process.env.EXPO_PUBLIC_API_URL = TEST_API_URL;
