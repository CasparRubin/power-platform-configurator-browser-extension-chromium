import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("build pipeline", () => {
  it("package.json build script includes each required extension target", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const build = pkg.scripts?.build ?? "";
    expect(build).toContain("build:sw");
    expect(build).toContain("build:content");
    expect(build).toContain("build:content-powerapps");
    expect(build).toContain("build:popup");
    expect(pkg.scripts?.prebuild).toBe("node scripts/prebuild-copy-public.mjs");
    expect(build).not.toContain("npm run prebuild");
  });

  it("vite popup config builds and renames the popup entry", () => {
    const config = readFileSync(join(repoRoot, "vite.popup.config.ts"), "utf8");
    expect(config).toContain("extensionHtmlPlugin");
    expect(config).toContain('resolve(popupRoot, "index.html")');
    expect(config).toContain('"popup.html"');
    expect(config).toContain('assetsDir: "popup-assets"');
  });

  it("html plugin module exports the popup extensionHtmlPlugin", () => {
    const plugin = readFileSync(
      join(repoRoot, "scripts", "vite-extension-html-plugin.mjs"),
      "utf8",
    );
    expect(plugin).toContain("export function extensionHtmlPlugin");
  });
});
