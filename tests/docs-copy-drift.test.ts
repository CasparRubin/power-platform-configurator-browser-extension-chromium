import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EXPECTED_MANIFEST_DESCRIPTION } from "./expected-manifest-description";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/** Phrases that referred to the old popup tab layout and should not return in user-facing docs. */
const LEGACY_POPUP_TAB_PHRASES = [
  /Tabs:\s*\*\*Editor\*\*/i,
  /\*\*Editor\*\*,\s*\*\*Survey\*\*,\s*and\s*\*\*About\*\*/i,
  /popup\s+\*\*Survey\*\*\s+tab/i,
  /popup\s+\*\*Editor\*\*\s+tab/i,
  /Survey tab saves/i,
  /Sync key for the popup Survey tab/i,
];

/** Flow Inspector / side panel copy must not return in user-facing docs (not the unit-test index table). */
const FLOW_INSPECTOR_PHRASES = [
  /## Flow Inspector/i,
  /Open Flow Inspector/i,
  /inspector\.html/i,
  /content-main-hook/i,
  /`sidePanel`/i,
  /api\.powerplatform\.com/i,
  /api\.bap\.microsoft\.com/i,
];

function readmeSection(readme: string, heading: string): string {
  const start = readme.indexOf(heading);
  if (start === -1) {
    return "";
  }
  const after = readme.slice(start + heading.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading === -1 ? after : after.slice(0, nextHeading);
}

const DOC_PATHS = [
  "README.md",
  "docs/chrome-web-store.md",
  "src/constants.ts",
  "src/background.ts",
  "src/content.ts",
  "src/popup/sync-write-queue.ts",
  "src/popup/persist-policy-preference.ts",
  "src/popup/reload-focused-target-tab.ts",
  "src/popup/popup-layout.ts",
  "src/storage-sync.ts",
  "vitest.config.ts",
] as const;

describe("documentation and comment copy (no legacy Editor/Survey tabs or Flow Inspector)", () => {
  it.each(DOC_PATHS)("%s avoids legacy popup tab naming", (relativePath) => {
    const text = readRepoFile(relativePath);
    for (const pattern of LEGACY_POPUP_TAB_PHRASES) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("README documents Power Automate, Power Apps, and TabProductIcon", () => {
    const readme = readRepoFile("README.md");
    expect(readme).toContain("Power Automate");
    expect(readme).toContain("Power Apps");
    expect(readme).toContain("TabProductIcon");
    expect(readme).toContain("content-powerapps.ts");
  });

  it("README user-facing sections avoid Flow Inspector and retired API permission copy", () => {
    const readme = readRepoFile("README.md");
    for (const heading of [
      "## What it does",
      "## Browser compatibility",
      "## Store listing vs manifest",
    ]) {
      const section = readmeSection(readme, heading);
      for (const pattern of FLOW_INSPECTOR_PHRASES) {
        expect(section).not.toMatch(pattern);
      }
    }
  });

  it("chrome-web-store.md avoids Flow Inspector and retired API permission copy", () => {
    const text = readRepoFile("docs/chrome-web-store.md");
    for (const pattern of FLOW_INSPECTOR_PHRASES) {
      expect(text).not.toMatch(pattern);
    }
  });

  it("chrome-web-store checklist matches current popup and permissions", () => {
    const doc = readRepoFile("docs/chrome-web-store.md");
    expect(doc).toContain("Power Automate tab");
    expect(doc).toContain("Power Apps tab");
    expect(doc).toContain("TabProductIcon");
    expect(doc).toContain("`scripting`");
    expect(doc).toContain("*.crm.dynamics.com");
    expect(doc).not.toContain("`sidePanel`");
    expect(doc).not.toMatch(/Flow Inspector/i);
    expect(doc).not.toMatch(/^\d+\.\s+\*\*Editor:\*\*/m);
  });

  it("public manifest description matches expected-manifest-description.ts", () => {
    const manifest = JSON.parse(readRepoFile("public/manifest.json")) as { description?: string };
    expect(manifest.description).toBe(EXPECTED_MANIFEST_DESCRIPTION);
  });

  it("public/icons lists product tab SVGs referenced by TabProductIcon", () => {
    const tabIcon = readRepoFile("src/popup/components/TabProductIcon.tsx");
    const iconDir = join(repoRoot, "public", "icons");
    const onDisk = readdirSync(iconDir).map((n) => n.toLowerCase());
    const imports = [...tabIcon.matchAll(/public\/icons\/([^"'?]+\.svg)/g)].map((m) => m[1]);
    expect(imports.length).toBe(2);
    for (const name of imports) {
      expect(onDisk).toContain(name.toLowerCase());
    }
  });
});
