import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const LOCAL_GATE_COMMANDS = [
  "verify:naming",
  "format:check",
  "lint",
  "typecheck",
  "test:coverage",
  "build",
  "test:dist:built",
  "package:zip",
] as const;

describe("README release documentation", () => {
  it("documents the complete local gate and manual release upload", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const releaseStart = readme.indexOf("## GitHub Releases");
    const releaseEnd = readme.indexOf("\n## ", releaseStart + 1);
    const releaseSection = readme.slice(
      releaseStart,
      releaseEnd === -1 ? readme.length : releaseEnd,
    );
    const predeploy = packageJson.scripts?.predeploy ?? "";

    expect(readme).toContain("npm run predeploy");
    expect(readme).toMatch(/local only/i);
    expect(releaseSection).toContain("npm run predeploy");
    expect(releaseSection).toContain("upload the generated zip");
    expect(releaseSection).toMatch(/manually/i);
    expect(readme).not.toContain(".github/workflows/");

    const commandIndexes = LOCAL_GATE_COMMANDS.map((command) =>
      predeploy.indexOf(`npm run ${command}`),
    );
    expect(commandIndexes.every((index) => index >= 0)).toBe(true);
    expect(commandIndexes).toEqual([...commandIndexes].sort((a, b) => a - b));
  });
});
