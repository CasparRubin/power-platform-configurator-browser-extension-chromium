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

/** Three sibling TabsContent with flex-1 split the panel into top/middle/bottom bands. */
const LEGACY_POPUP_LAYOUT_PHRASES = [
  /TabsContent[^>]*className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden outline-none"/,
];

/** Helvety popup-shell row helper and ad-hoc spacing superseded by popup-layout tokens. */
const LEGACY_POPUP_SPACING_AND_ROW_PHRASES = [
  /@helvety\/extension-chrome\/popup-shell/,
  /\bpopupChoiceRowClass\s*\(/,
  /className="flex flex-col gap-1\.5"/,
];

const POPUP_SETTINGS_SOURCE_PATHS = [
  "src/popup/App.tsx",
  "src/popup/components/PowerAutomatePanel.tsx",
  "src/popup/components/PowerAppsPanel.tsx",
  "src/popup/components/SettingsChoiceRow.tsx",
  "src/popup/components/SettingsSectionHeader.tsx",
] as const;

/** Power Apps popup used action buttons before radio settings (Hide/Show, Lock/Unlock). */
const LEGACY_POWER_APPS_POPUP_UI_PHRASES = [
  /action buttons on an open model-driven/i,
  /Power Apps one-shot unhide\/unlock/i,
  /one-shot\s+\*\*Unhide hidden fields\*\*/i,
  /runs one-shot\s+\*\*Unhide/i,
  /\*\*Unhide hidden fields\*\* and \*\*Unlock read-only fields\*\*/i,
  /Unhide hidden fields\s*\/\s*\*\*Unlock read-only fields\*\*/i,
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
  "src/popup/App.tsx",
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

  it("popup shell uses a single tab panel host (not three flex-split TabsContent bands)", () => {
    const layout = readRepoFile("src/popup/popup-layout.ts");
    expect(layout).toContain("TAB_PANEL_HOST_CLASS");
    expect(layout).toContain("TAB_CONTENT_CLASS");
    expect(layout).toContain("settingsChoiceRowClass");
    expect(layout).toContain("SETTINGS_RADIO_GROUP_CLASS");
    expect(layout).toContain("TAB_PANEL_BODY_CLASS");
    const app = readRepoFile("src/popup/App.tsx");
    expect(app).toContain("TAB_PANEL_HOST_CLASS");
    for (const pattern of LEGACY_POPUP_LAYOUT_PHRASES) {
      expect(app).not.toMatch(pattern);
    }
  });

  it.each(POPUP_SETTINGS_SOURCE_PATHS)(
    "%s uses centralized spacing (no legacy popup-shell choice rows)",
    (relativePath) => {
      const text = readRepoFile(relativePath);
      for (const pattern of LEGACY_POPUP_SPACING_AND_ROW_PHRASES) {
        expect(text).not.toMatch(pattern);
      }
    },
  );

  it("About tab avoids asymmetric pr-2-only scroll wrapper", () => {
    const app = readRepoFile("src/popup/App.tsx");
    expect(app).toContain("ABOUT_CARD_HEADER_CLASS");
    expect(app).not.toContain('className="pr-2"');
  });

  it("README documents Power Automate, Power Apps, and TabProductIcon", () => {
    const readme = readRepoFile("README.md");
    expect(readme).toContain("Power Automate");
    expect(readme).toContain("Power Apps");
    expect(readme).toContain("TabProductIcon");
    expect(readme).toContain("content-powerapps.ts");
    expect(readme).toContain("SettingsChoiceRow");
    expect(readme).toContain("settingsChoiceRowClass");
  });

  it("chrome-web-store smoke test mentions full-height tab content and shared choice rows", () => {
    const doc = readRepoFile("docs/chrome-web-store.md");
    expect(doc).toMatch(/full-height|not three short bands/i);
    expect(doc).toContain("SettingsChoiceRow");
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
    for (const pattern of LEGACY_POWER_APPS_POPUP_UI_PHRASES) {
      expect(doc).not.toMatch(pattern);
    }
    expect(doc).toMatch(/Hide hidden fields|Show hidden fields/i);
    expect(doc).toMatch(/Lock read-only|Unlock read-only/i);
  });

  it("README avoids legacy Power Apps button and one-shot UI copy", () => {
    const readme = readRepoFile("README.md");
    for (const pattern of LEGACY_POWER_APPS_POPUP_UI_PHRASES) {
      expect(readme).not.toMatch(pattern);
    }
  });

  it("README user-facing sections describe Power Apps radio settings (not action buttons)", () => {
    const readme = readRepoFile("README.md");
    for (const heading of ["## What it does", "## Validation checklist", "## Repository layout"]) {
      const section = readmeSection(readme, heading);
      for (const pattern of LEGACY_POWER_APPS_POPUP_UI_PHRASES) {
        expect(section).not.toMatch(pattern);
      }
    }
    const whatItDoes = readmeSection(readme, "## What it does");
    expect(whatItDoes).toMatch(
      /Hide hidden fields|Show hidden fields|\*\*Hide\*\*.*hidden fields|\*\*Show\*\*.*hidden fields/i,
    );
    expect(whatItDoes).toMatch(
      /Lock read-only|Unlock read-only|\*\*Lock\*\*.*read-only|\*\*Unlock\*\*.*read-only/i,
    );
    const validation = readmeSection(readme, "## Validation checklist");
    expect(validation).toMatch(/Hide hidden|Show hidden|hidden fields/i);
    expect(validation).toMatch(/Unlock read-only|Lock read-only|read-only/i);
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
