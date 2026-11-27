/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // Sin caché cada worker transforma todo desde cero; con un worker por
  // núcleo y el host cargado, la primera corrida se alarga. Menos workers lo
  // suaviza.
  maxWorkers: "50%",
  // El primer test de cada suite carga y transforma (sin caché) react-native,
  // Testing Library y la pantalla, y tarda 15 a 30 s solo esa vez; con la
  // caché tibia una suite entera corre en menos de 5 s. 30 s cubre el frío
  // sin esconder un test lento de verdad: eso se ve en el tiempo de la suite.
  testTimeout: 30_000,
  testEnvironment: "<rootDir>/tests/jest/environment.js",
  setupFiles: ["<rootDir>/src/test/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // La fábrica deja un checkout completo por ticket en .claude/worktrees/:
  // sin esto jest correría también los tests de otras ramas.
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/.claude/",
    "<rootDir>/.factory/",
    "<rootDir>/tests/",
    "<rootDir>/dist/",
    "<rootDir>/android/",
    "<rootDir>/ios/",
  ],
  modulePathIgnorePatterns: [
    "<rootDir>/.claude/",
    "<rootDir>/.factory/",
    "<rootDir>/dist/",
  ],
  watchPathIgnorePatterns: ["<rootDir>/.claude/", "<rootDir>/.factory/"],
  // msw v3 y sus piezas solo se publican como ESM: jest las tiene que
  // transformar igual que transforma react-native y expo.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|standard-navigation|msw|@msw|@mswjs|@open-draft|until-async|rettime|headers-polyfill|is-node-process|outvariant|cookie|set-cookie-parser|strict-event-emitter))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  transform: {
    "^.+\\.mjs$": ["babel-jest", { presets: ["expo/internal/babel-preset"] }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
