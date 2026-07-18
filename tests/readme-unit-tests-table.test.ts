import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Links from the Test suites markdown table only (ignores inline refs elsewhere in README). */
function extractReadmeTestTableLinks(readme: string): string[] {
  const table = readme.slice(readme.indexOf("## Test suites"));
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

describe("README test suites table", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");
  const onDisk = new Set(
    readdirSync(join(repoRoot, "tests"))
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => `tests/${name}`),
  );

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
