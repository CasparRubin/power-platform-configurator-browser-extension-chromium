import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README release documentation", () => {
  it("documents that Release workflow runs verify:naming, lint, typecheck, and test before build", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("## Continuous integration");
    expect(readme).toContain(".github/workflows/ci.yml");
    expect(readme).not.toMatch(/does \*\*not\*\* run tests or lint/i);
    const releaseSection = readme.slice(readme.indexOf("## GitHub Releases"));
    expect(releaseSection).toContain("verify:naming");
    expect(releaseSection).toContain("typecheck");
    expect(releaseSection).toMatch(/\btest\b/);
  });
});
