import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("GitHub Actions CI workflow", () => {
  it("runs naming guard and tests before build on push and pull_request", () => {
    const ciPath = join(repoRoot, ".github", "workflows", "ci.yml");
    expect(existsSync(ciPath)).toBe(true);
    const workflow = readFileSync(ciPath, "utf8");
    expect(workflow).toContain("npm run verify:naming");
    expect(workflow).toContain("npm run lint");
    expect(workflow).toContain("npm run typecheck");
    expect(workflow).toContain("npm run test");
    expect(workflow).toContain("npm run build");
    expect(workflow).toMatch(/pull_request|push/);
  });

  it("release workflow runs the same checks before packaging", () => {
    const releasePath = join(repoRoot, ".github", "workflows", "release.yml");
    const workflow = readFileSync(releasePath, "utf8");
    expect(workflow).toContain("npm run verify:naming");
    expect(workflow).toContain("npm run test");
    expect(workflow).toContain("power-platform-configurator-");
  });
});
