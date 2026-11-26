import path from "node:path";

const root = path.resolve(__dirname, "../..");

type Config = { resolver: { blockList: RegExp | RegExp[] } };

function loadConfig(): Config {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(path.join(root, "metro.config.js")) as Config;
}

function isBlocked(file: string): boolean {
  const { blockList } = loadConfig().resolver;
  const list = Array.isArray(blockList) ? blockList : [blockList];
  return list.some((re) => re.test(file));
}

describe("metro.config.js", () => {
  it("blocks the factory worktrees", () => {
    expect(
      isBlocked(path.join(root, ".claude/worktrees/impl-1/node_modules/a.js")),
    ).toBe(true);
    expect(
      isBlocked(path.join(root, ".claude/worktrees/impl-1/app/x.tsx")),
    ).toBe(true);
  });

  it("blocks the pnpm store", () => {
    expect(isBlocked(path.join(root, ".pnpm-store/v3/files/ab/cd"))).toBe(true);
  });

  it("keeps the project sources and dependencies", () => {
    expect(isBlocked(path.join(root, "src/index.ts"))).toBe(false);
    expect(isBlocked(path.join(root, "app/_layout.tsx"))).toBe(false);
    expect(isBlocked(path.join(root, "node_modules/react/index.js"))).toBe(
      false,
    );
  });

  it("is anchored to the project root", () => {
    expect(isBlocked("/other/.claude/worktrees/impl-1/a.js")).toBe(false);
    expect(isBlocked("/other/.pnpm-store/a.js")).toBe(false);
  });

  it("keeps the default blockList entries", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDefaultConfig } = require("expo/metro-config");
    const defaults = getDefaultConfig(root).resolver.blockList as RegExp[];
    const mine = loadConfig().resolver.blockList as RegExp[];
    for (const entry of defaults) {
      expect(mine.map((re) => re.source)).toContain(entry.source);
    }
  });
});
