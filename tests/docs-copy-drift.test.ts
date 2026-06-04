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
  "src/popup/components/AboutPanel.tsx",
  "src/popup/components/PowerAutomatePanel.tsx",
  "src/popup/components/PowerAppsPanel.tsx",
  "src/popup/components/SettingsTabPanel.tsx",
  "src/popup/components/SettingsChoiceRow.tsx",
  "src/popup/components/SettingsSectionHeader.tsx",
  "src/popup/components/SettingsBusyHint.tsx",
  "src/popup/components/PopupNotificationRegion.tsx",
  "src/popup/components/SettingsStatusAlert.tsx",
  "src/popup/components/SettingsInfoAlert.tsx",
] as const;

/** Status was shown as plain muted text at panel top or under tabs without Alert chrome. */
const LEGACY_POPUP_STATUS_UX_PHRASES = [
  /className="mt-1\.5 flex min-h-\[1\.25rem\][^"]*text-muted-foreground"/,
  /<p\s+className="text-xs leading-snug text-muted-foreground"[^>]*role="status"/,
] as const;

/** Retired busy hint and per-panel storage load for Power Apps prefs. */
const LEGACY_POPUP_SETTINGS_UX_PHRASES = [
  /\bPolicyPanelBusyHint\b/,
  /\bprefsLoaded\b/,
  /\bpolicyLoaded\b/,
  /disabled=\{busy\}/,
  /disabled=\{isPolicySyncBusy\}/,
] as const;

/** User-facing copy that claimed radios lock during sync (removed in settings UX pass). */
const OUTDATED_POPUP_RADIO_DISABLE_COPY = [
  /radio groups are disabled only while/i,
  /radios briefly disable only while/i,
  /disable only while the sync write/i,
  /disabled only while the sync write/i,
] as const;

const POPUP_USER_FACING_DOC_PATHS = ["README.md", "docs/chrome-web-store.md"] as const;

/** Save feedback copy that predates the shared notification slot below the tab bar. */
const LEGACY_POPUP_NOTIFICATION_DOC_PHRASES = [
  /top status spinner/i,
  /plus a top status/i,
  /section hints show \*\*Saving/i,
  /SettingsBusyHint\*\* on each section shows \*\*Saving/i,
  /hints show \*\*Saving…\*\* \/ \*\*Reloading tab/i,
  /The status line should show success/i,
  /confirm the status line \(/i,
  /while \*\*SettingsBusyHint\*\* and the status line show progress/i,
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

/** Vague inject failure copy before structured `inject_no_result` / frame diagnostics. */
const LEGACY_POWER_APPS_VAGUE_ERROR_PHRASES = [
  /Could not apply changes\. Reload the form tab and try again\./,
  /Reload the form tab and try again\./,
];

/** Old reload wording superseded by “reload the page” in panels, status strings, and errors. */
const OUTDATED_RELOAD_FORM_COPY = [
  /reload forms to restore/i,
  /reload the form to restore/i,
  /Reload the form to restore/i,
];

/** Pre-v2.19 copy: choices did not persist across popup close or navigation. */
const OUTDATED_POWER_APPS_NOT_PERSISTED_PHRASES = [
  /not persisted across popup/i,
  /Choices are not persisted/i,
  /only runs once when toggled/i,
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

  it("About tab uses shared settings panel shell (no card border)", () => {
    const about = readRepoFile("src/popup/components/AboutPanel.tsx");
    expect(about).toContain("SettingsTabPanel");
    expect(about).not.toContain("@helvety/ui/card");
    expect(about).not.toContain('className="pr-2"');
  });

  it("persist-status-messages documents reload outcomes for both products", () => {
    const messages = readRepoFile("src/popup/persist-status-messages.ts");
    expect(messages).toMatch(/savedReloaded/);
    expect(messages).toMatch(/savedReloadPage/);
    expect(messages).toMatch(/Reload the flow or run page/i);
    expect(messages).toMatch(/Reload the page/i);
  });

  it("Power Automate panel uses compact v3 copy and reload guidance", () => {
    const panel = readRepoFile("src/popup/components/PowerAutomatePanel.tsx");
    expect(panel).toMatch(/v3=false/);
    expect(panel).not.toMatch(/Rewritten links use/i);
    expect(panel).toMatch(/reload the page yourself/i);
  });

  it("Power Apps panel tells users to reload the page when enforcement stops", () => {
    const panel = readRepoFile("src/popup/components/PowerAppsPanel.tsx");
    expect(panel).toMatch(/Reload the page to restore/i);
    expect(panel).not.toMatch(/Reload the form to restore/i);
  });

  it("user-facing docs and popup sources avoid legacy reload-the-form wording", () => {
    const paths = [
      ...POPUP_USER_FACING_DOC_PATHS,
      "src/popup/components/PowerAppsPanel.tsx",
      "src/popup/components/PowerAutomatePanel.tsx",
      "src/popup/powerapps-client.ts",
      "src/popup/persist-status-messages.ts",
    ] as const;
    for (const path of paths) {
      const text = readRepoFile(path);
      for (const pattern of OUTDATED_RELOAD_FORM_COPY) {
        expect(text).not.toMatch(pattern);
      }
    }
    expect(readRepoFile("src/popup/powerapps-client.ts")).toMatch(/Reload the page/i);
  });

  it("README repository layout documents unified popup tab shell and status strings", () => {
    const layout = readmeSection(readRepoFile("README.md"), "## Repository layout");
    expect(layout).toContain("SettingsTabPanel");
    expect(layout).toContain("AboutPanel");
    expect(layout).toContain("persist-status-messages.ts");
    expect(layout).not.toMatch(/ABOUT_CARD_/);
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
    expect(doc).toMatch(/\*\.\*\.dynamics\.com|crm17\.dynamics\.com/i);
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
    for (const pattern of LEGACY_POWER_APPS_VAGUE_ERROR_PHRASES) {
      expect(readme).not.toMatch(pattern);
    }
    for (const pattern of OUTDATED_POWER_APPS_NOT_PERSISTED_PHRASES) {
      expect(readme).not.toMatch(pattern);
    }
  });

  it("README and store doc document global persisted Power Apps enforcement", () => {
    const readme = readRepoFile("README.md");
    expect(readme).toMatch(/powerAppsHiddenFields|chrome\.storage\.sync/i);
    expect(readme).toMatch(/stays on|auto-apply|persist/i);
    for (const pattern of OUTDATED_POWER_APPS_NOT_PERSISTED_PHRASES) {
      expect(readme).not.toMatch(pattern);
    }

    const storeDoc = readRepoFile("docs/chrome-web-store.md");
    expect(storeDoc).toMatch(/choices persist in sync|stay on across tabs/i);
    for (const pattern of OUTDATED_POWER_APPS_NOT_PERSISTED_PHRASES) {
      expect(storeDoc).not.toMatch(pattern);
    }
    const panel = readRepoFile("src/popup/components/PowerAppsPanel.tsx");
    const app = readRepoFile("src/popup/App.tsx");
    expect(panel).toMatch(/persistPowerAppsPreference|SettingsBusyHint/i);
    expect(panel).toMatch(/stays on|auto-apply/i);
    expect(app).toMatch(/POPUP_SYNC_SETTINGS_KEYS|parsePowerAppsPreferencesFromSync/i);
    expect(panel).not.toMatch(/chrome\.storage\.sync/);
  });

  it("README and store doc describe notification area (not legacy top status line only)", () => {
    for (const path of POPUP_USER_FACING_DOC_PATHS) {
      const text = readRepoFile(path);
      for (const pattern of LEGACY_POPUP_NOTIFICATION_DOC_PHRASES) {
        expect(text).not.toMatch(pattern);
      }
      expect(text).toMatch(
        /notification (area|slot|region)|PopupNotificationRegion|SettingsStatusAlert/i,
      );
      expect(text).toMatch(/SettingsInfoAlert/i);
    }
  });

  it("README and store doc describe reload outcomes in save feedback (not only Saved.)", () => {
    for (const path of POPUP_USER_FACING_DOC_PATHS) {
      const text = readRepoFile(path);
      expect(text).toMatch(/Reload the flow or run page|Reloaded the open flow or run page/i);
      expect(text).toMatch(/Reload the page/i);
    }
  });

  it("README and store doc do not claim settings radios disable during sync", () => {
    for (const path of POPUP_USER_FACING_DOC_PATHS) {
      const text = readRepoFile(path);
      for (const pattern of OUTDATED_POPUP_RADIO_DISABLE_COPY) {
        expect(text).not.toMatch(pattern);
      }
      expect(text).toMatch(/SettingsBusyHint|POPUP_SYNC_SETTINGS_KEYS|stay enabled|full.row/i);
    }
  });

  it("popup settings sources use notification alerts instead of legacy plain status lines", () => {
    for (const path of POPUP_SETTINGS_SOURCE_PATHS) {
      const text = readRepoFile(path);
      for (const pattern of LEGACY_POPUP_STATUS_UX_PHRASES) {
        expect(text).not.toMatch(pattern);
      }
    }
    const app = readRepoFile("src/popup/App.tsx");
    expect(app).toContain("PopupNotificationRegion");
    expect(readRepoFile("src/popup/components/PopupNotificationRegion.tsx")).toContain(
      "SettingsStatusAlert",
    );
    expect(readRepoFile("src/popup/components/SettingsSectionHeader.tsx")).toContain(
      "SettingsInfoAlert",
    );
    expect(readRepoFile("src/popup/components/PowerAppsPanel.tsx")).not.toMatch(/role="status"/);
  });

  it("popup settings sources use unified choice rows and do not lock radios during save", () => {
    for (const path of POPUP_SETTINGS_SOURCE_PATHS) {
      const text = readRepoFile(path);
      for (const pattern of LEGACY_POPUP_SETTINGS_UX_PHRASES) {
        expect(text).not.toMatch(pattern);
      }
    }
    const choiceRow = readRepoFile("src/popup/components/SettingsChoiceRow.tsx");
    expect(choiceRow).toMatch(/<Label className=\{settingsChoiceRowClass/);
    expect(choiceRow).not.toContain("htmlFor=");
    const appsPanel = readRepoFile("src/popup/components/PowerAppsPanel.tsx");
    expect(appsPanel).toContain("onHiddenModeChange");
    expect(appsPanel).toContain("setStatus:");
    expect(appsPanel).not.toContain("chrome.storage.sync");
    expect(appsPanel).toContain("powerAppsPanelBusyMode");
  });

  it("Power Apps user-facing source avoids vague inject-only error copy", () => {
    for (const path of ["README.md", "docs/chrome-web-store.md", ...POPUP_SETTINGS_SOURCE_PATHS]) {
      const text = readRepoFile(path);
      for (const pattern of LEGACY_POWER_APPS_VAGUE_ERROR_PHRASES) {
        expect(text).not.toMatch(pattern);
      }
    }
    const client = readRepoFile("src/popup/powerapps-client.ts");
    expect(client).toContain("inject_no_result");
    expect(client).toContain("host_not_permitted");
    expect(client).not.toMatch(/Could not apply changes\. Reload the form tab and try again\./);
  });

  it("README and store doc document per-cluster Dataverse hosts (no invalid wildcards)", () => {
    for (const path of ["README.md", "docs/chrome-web-store.md"]) {
      const text = readRepoFile(path);
      expect(text).toMatch(
        /crm17|dynamics\.cn|microsoftdynamics\.de|datacenter-regions|per-cluster|per-region/i,
      );
      expect(text).not.toContain("https://*.*.dynamics.com/*");
      expect(text).toMatch(
        /learn\.microsoft\.com\/en-us\/power-platform\/admin\/new-datacenter-regions/i,
      );
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
    expect(validation).toMatch(/saves to sync|stay visible|enforcement stops/i);
    for (const pattern of OUTDATED_POWER_APPS_NOT_PERSISTED_PHRASES) {
      expect(validation).not.toMatch(pattern);
    }
    expect(validation).not.toMatch(/no API call/i);
  });

  it("README Implementation notes document Power Apps host permissions and host_not_permitted", () => {
    const readme = readRepoFile("README.md");
    const section = readmeSection(readme, "## Implementation notes");
    expect(section).toMatch(/crm17|per-cluster|invalid host wildcard|datacenter/i);
    expect(section).toContain("host_not_permitted");
    expect(section).toMatch(/constants\.ts|DATAVERSE_ORG_HOST_SUFFIXES/i);
    expect(section).not.toContain("https://*.*.dynamics.com/*");
  });

  it("PowerAppsPanel describes model-driven forms; About copy mentions Dataverse hosts", () => {
    const panel = readRepoFile("src/popup/components/PowerAppsPanel.tsx");
    expect(panel).toMatch(/model-driven app|record form/i);
    expect(panel).not.toMatch(/Dataverse \/ Dynamics—commercial/i);
    expect(panel).not.toMatch(/one-shot|action buttons on an open model-driven/i);
    expect(readRepoFile("src/popup/components/AboutPanel.tsx")).toMatch(
      /crm17|\.crm\d*\.dynamics|reload the extension/i,
    );
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
