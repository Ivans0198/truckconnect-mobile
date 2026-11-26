// https://docs.expo.dev/guides/customizing-metro/
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// La fábrica deja una copia del repo (con sus node_modules) por issue en
// .claude/worktrees/, y pnpm puede dejar un store en .pnpm-store/. Metro los
// vigilaría y agotaría el límite de watchers (ENOSPC). Las expresiones se
// anclan a la raíz para no excluir el propio árbol cuando Metro corre dentro
// de un worktree.
const ignoredDirs = [".claude/worktrees", ".pnpm-store"].map(
  (dir) => new RegExp(`^${escapeRegExp(path.join(__dirname, dir))}[\\\\/].*`),
);

const defaultBlockList = config.resolver.blockList ?? [];

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : [defaultBlockList]),
  ...ignoredDirs,
];

module.exports = config;
