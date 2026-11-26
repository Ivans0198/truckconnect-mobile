/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
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
