import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const AUTOMATION_DOC_PATHS = ["README.md", "docs/chrome-web-store.md"] as const;

const STALE_AUTOMATION_PHRASES = [
  "GitHub Actions",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".github/workflows/",
  "softprops/action-gh-release",
  "Release workflow",
  "extension-only CI",
  "CI-style",
  "headed browser for CI",
] as const;

describe("automation policy consistency", () => {
  it("does not ship GitHub workflow files", async () => {
    const workflowsPath = join(repoRoot, ".github", "workflows");
    const workflows = await readdir(workflowsPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    });

    expect(workflows).toEqual([]);
  });

  it("documents local-only validation and avoids stale remote automation wording", async () => {
    for (const relativePath of AUTOMATION_DOC_PATHS) {
      const source = await readFile(join(repoRoot, relativePath), "utf8");

      for (const phrase of STALE_AUTOMATION_PHRASES) {
        expect(source, `${relativePath} contains stale phrase: ${phrase}`).not.toContain(phrase);
      }
    }

    const readme = await readFile(join(repoRoot, "README.md"), "utf8");
    expect(readme).toContain("npm run predeploy");
    expect(readme).toMatch(/local only/i);
    expect(readme).toMatch(/no remote automation/i);
    expect(readme).toContain("automation-policy-consistency");
  });
});
