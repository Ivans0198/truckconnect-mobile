// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

// Archivos que corren solo en desarrollo o en tests: pueden importar
// devDependencies. El código de la app (app/, src/) no.
const DEV_ONLY_FILES = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/__tests__/**",
  "jest.setup.ts",
  "tests/**",
  "src/test/**",
  // Mocks de desarrollo: index.js los carga solo detrás de __DEV__ y Metro
  // los quita del bundle de producción.
  "src/mocks/**",
  "*.config.js",
  "*.config.ts",
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // .claude/worktrees/ tiene un checkout completo por ticket: sin esto el
    // lint reportaría el repo entero una vez por worktree.
    ignores: [
      "node_modules/**",
      "dist/**",
      "android/**",
      "ios/**",
      ".expo/**",
      ".claude/**",
      ".factory/**",
      "docs/**",
      "src/api/schema.d.ts",
      "expo-env.d.ts",
    ],
  },
  {
    rules: {
      // Una dependencia que llega transitivamente funciona hasta que su dueño
      // la quita. Todo import tiene que estar declarado en package.json.
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: DEV_ONLY_FILES,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);
