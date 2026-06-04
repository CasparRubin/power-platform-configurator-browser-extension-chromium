import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Retired suites — must not appear in README's unit-test table links. */
const RETIRED_TEST_FILES = [
  "tests/bridge-tab.test.ts",
  "tests/context-url.test.ts",
  "tests/debug-log.test.ts",
  "tests/flow-api.test.ts",
  "tests/inspector-api-fetch.test.ts",
  "tests/msal-token-scan.test.ts",
  "tests/portal-proxy-url.test.ts",
  "tests/session-bridge.test.ts",
  "tests/token-match.test.ts",
  "tests/powerapps-form-field-actions.test.ts",
] as const;

/** Links from the Unit tests markdown table only (ignores inline refs elsewhere in README). */
function extractReadmeTestTableLinks(readme: string): string[] {
  const table = readme.slice(readme.indexOf("## Unit tests"));
  const links = new Set<string>();
  for (const line of table.split("\n")) {
    if (!line.startsWith("| [`tests/")) {
      continue;
    }
    const match = line.match(/\[`(tests\/[^`]+\.test\.ts)`\]/);
    if (match && !match[1].includes("*")) {
      links.add(match[1]);
    }
  }
  return [...links].sort();
}

describe("README unit tests table", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const onDisk = new Set(
    readdirSync(join(repoRoot, "tests"))
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => `tests/${name}`),
  );

  it("does not link retired Flow Inspector test suites", () => {
    const linked = extractReadmeTestTableLinks(readme);
    for (const retired of RETIRED_TEST_FILES) {
      expect(linked).not.toContain(retired);
      expect(onDisk.has(retired)).toBe(false);
    }
  });

  it("links every tests/*.test.ts file (bijective with disk)", () => {
    const linked = extractReadmeTestTableLinks(readme).sort();
    const diskSorted = [...onDisk].sort();
    expect(linked.length).toBeGreaterThan(10);
    expect(linked).toEqual(diskSorted);
    for (const path of linked) {
      expect(existsSync(join(repoRoot, path))).toBe(true);
    }
  });
});
