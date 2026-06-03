import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const REMOVED_PATHS = [
  "src/inspector",
  "src/content-main-hook.ts",
  "src/background/inspector-router.ts",
  "vite.inspector.config.ts",
  "tests/bridge-tab.test.ts",
  "tests/flow-api.test.ts",
  "tests/session-bridge.test.ts",
] as const;

describe("build pipeline (no Flow Inspector artifacts)", () => {
  it("package.json build script bundles only core extension targets", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const build = pkg.scripts?.build ?? "";
    expect(build).toContain("build:sw");
    expect(build).toContain("build:content");
    expect(build).toContain("build:content-powerapps");
    expect(build).toContain("build:popup");
    expect(build).not.toContain("build:inspector");
    expect(build).not.toContain("build:content-main");
    expect(pkg.scripts?.["build:inspector"]).toBeUndefined();
    expect(pkg.scripts?.["build:content-main"]).toBeUndefined();
  });

  it.each(REMOVED_PATHS)("%s is not present in the repo", (relativePath) => {
    expect(existsSync(join(repoRoot, relativePath))).toBe(false);
  });

  it("vite popup config does not reference inspector html plugin", () => {
    const config = readFileSync(join(repoRoot, "vite.popup.config.ts"), "utf8");
    expect(config).toContain("extensionHtmlPlugin");
    expect(config).not.toContain("inspectorHtmlBundlePlugin");
    expect(config).not.toContain("vite.inspector.config");
  });

  it("html plugin module only exports popup extensionHtmlPlugin", () => {
    const plugin = readFileSync(
      join(repoRoot, "scripts", "vite-extension-html-plugin.mjs"),
      "utf8",
    );
    expect(plugin).toContain("export function extensionHtmlPlugin");
    expect(plugin).not.toContain("inspectorHtmlBundlePlugin");
  });
});
