import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README Helvety vendor documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const vendorSection = readme.slice(readme.indexOf("## Helvety workspace packages"));

  it("documents copy-based .helvety vendor (not monorepo symlink)", () => {
    expect(vendorSection).toContain("copies");
    expect(vendorSection).toContain(".helvety/");
    expect(vendorSection).toContain("@helvety/extension-chrome");
    expect(vendorSection).not.toMatch(/symlink.*\.\.\/helvety/i);
  });

  it("documents skipping node_modules and build caches when copying", () => {
    expect(vendorSection).toMatch(/skips.*node_modules/i);
    expect(vendorSection).toMatch(/\.turbo/);
  });

  it("documents @helvety/ui instead of app-local shadcn tree", () => {
    expect(vendorSection).toContain("@helvety/ui");
    expect(vendorSection).toMatch(/not app-local.*components\/ui/i);
  });
});
