import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function expectCommandOrder(workflow: string, commands: readonly string[]): void {
  const indexes = commands.map((command) => workflow.indexOf(command));
  for (const index of indexes) {
    expect(index).toBeGreaterThanOrEqual(0);
  }
  for (let index = 1; index < indexes.length; index += 1) {
    expect(indexes[index - 1]).toBeLessThan(indexes[index] ?? -1);
  }
}

describe("GitHub Actions CI workflow", () => {
  it("runs naming guard and tests before build on push and pull_request", () => {
    const ciPath = join(repoRoot, ".github", "workflows", "ci.yml");
    expect(existsSync(ciPath)).toBe(true);
    const workflow = readFileSync(ciPath, "utf8");
    expectCommandOrder(workflow, [
      "npm run verify:naming",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run test:dist",
    ]);
    expect(workflow).toMatch(/pull_request|push/);
  });

  it("release workflow runs the same checks before packaging", () => {
    const releasePath = join(repoRoot, ".github", "workflows", "release.yml");
    const workflow = readFileSync(releasePath, "utf8");
    expectCommandOrder(workflow, [
      "npm run verify:naming",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run test:dist",
    ]);
    expect(workflow).toContain("power-platform-configurator-");
  });
});
