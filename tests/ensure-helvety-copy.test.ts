import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { SKIP_DIR_NAMES, copyPackageTree } = require("../scripts/ensure-helvety.mjs") as {
  SKIP_DIR_NAMES: Set<string>;
  copyPackageTree: (sourceDir: string, destDir: string) => void;
};

describe("ensure-helvety copyPackageTree", () => {
  it("skips node_modules and other cache/build directories", () => {
    expect([...SKIP_DIR_NAMES].sort()).toEqual(
      [".next", ".turbo", "coverage", "dist", "node_modules"].sort(),
    );

    const fixtureRoot = mkdtempSync(join(tmpdir(), "ppc-ensure-helvety-"));
    const source = join(fixtureRoot, "source");
    const dest = join(fixtureRoot, "dest");

    try {
      mkdirSync(join(source, "src"), { recursive: true });
      mkdirSync(join(source, "node_modules", "stale-pkg"), { recursive: true });
      mkdirSync(join(source, ".turbo"), { recursive: true });
      mkdirSync(join(source, "coverage"), { recursive: true });
      mkdirSync(join(source, "dist"), { recursive: true });
      mkdirSync(join(source, ".next"), { recursive: true });
      writeFileSync(join(source, "package.json"), '{"name":"fixture"}\n');
      writeFileSync(join(source, "src", "index.ts"), "export {};\n");
      writeFileSync(
        join(source, "node_modules", "stale-pkg", "package.json"),
        '{"name":"stale"}\n',
      );
      writeFileSync(join(source, ".turbo", "cache.json"), "{}\n");
      writeFileSync(join(source, "coverage", "lcov.info"), "TN:\n");
      writeFileSync(join(source, "dist", "bundle.js"), "// built\n");
      writeFileSync(join(source, ".next", "trace"), "trace\n");

      copyPackageTree(source, dest);

      expect(existsSync(join(dest, "package.json"))).toBe(true);
      expect(existsSync(join(dest, "src", "index.ts"))).toBe(true);
      expect(existsSync(join(dest, "node_modules"))).toBe(false);
      expect(existsSync(join(dest, ".turbo"))).toBe(false);
      expect(existsSync(join(dest, "coverage"))).toBe(false);
      expect(existsSync(join(dest, "dist"))).toBe(false);
      expect(existsSync(join(dest, ".next"))).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
