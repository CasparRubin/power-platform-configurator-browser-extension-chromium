import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readmeSection(readme: string, heading: string): string {
  const start = readme.indexOf(heading);
  if (start === -1) {
    return "";
  }
  const after = readme.slice(start + heading.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading === -1 ? after : after.slice(0, nextHeading);
}

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

describe("README and docs accuracy (current product scope)", () => {
  const readme = readRepoFile("README.md");
  const pkg = JSON.parse(readRepoFile("package.json")) as { scripts?: Record<string, string> };

  it("documents the full npm run build pipeline", () => {
    const scriptsSection = readmeSection(readme, "### Scripts");
    expect(scriptsSection).toMatch(/`npm run build`/);
    expect(scriptsSection).toMatch(/content-powerapps/i);
    expect(scriptsSection).toMatch(/800\s*[×x]\s*600|800×600/i);
    expect(scriptsSection).not.toMatch(/build:inspector/i);
    expect(scriptsSection).not.toMatch(/content-main-hook/i);

    const build = pkg.scripts?.build ?? "";
    expect(build).toContain("build:content-powerapps");
    expect(build).not.toContain("build:inspector");
  });

  it("What it does describes 800×600 popup and four core settings only", () => {
    const section = readmeSection(readme, "## What it does");
    expect(section).toMatch(/800\s*[×x]\s*600|800×600/i);
    expect(section).toContain("SettingsChoiceRow");
    expect(section).toContain("SettingsBusyHint");
    expect(section).toContain("POPUP_SYNC_SETTINGS_KEYS");
    expect(section).toMatch(/stay enabled|full.row/i);
    expect(section).not.toMatch(/radio groups are disabled only while/i);
    expect(section).toContain("TAB_PANEL_HOST_CLASS");
    expect(section).toContain("SettingsTabPanel");
    expect(section).toMatch(/persist-status-messages|format-powerapps-preferences/i);
    expect(section).toMatch(/Reload the (flow or run page|page)/i);
    expect(section).toMatch(
      /in-popup retries|still loading|Reload the page to apply on this record form/i,
    );
    expect(section).toContain("Power Automate");
    expect(section).toContain("Power Apps");
    expect(section).toContain("v3survey");
    expect(section).toMatch(
      /Hide hidden fields|Show hidden fields|\*\*Hide\*\*.*hidden fields|\*\*Show\*\*.*hidden fields/i,
    );
    expect(section).toMatch(
      /Lock read-only|Unlock read-only|\*\*Lock\*\*.*read-only|\*\*Unlock\*\*.*read-only/i,
    );
    expect(section).not.toMatch(/one-shot/i);
    expect(section).not.toMatch(/action buttons on an open model-driven/i);
    expect(section).toMatch(/executeScript|MAIN world|powerAppsFormActionInPage/i);
    expect(section).toMatch(/persist-powerapps-preference|apply-preferences|content-powerapps/i);
    expect(section).toMatch(/powerAppsHiddenFields|chrome\.storage\.sync/i);
    expect(section).toContain("powerapps-client.ts");
    expect(section).not.toContain("Flow Inspector");
    expect(section).not.toContain("side panel");
    expect(section).not.toContain("inspector.html");
  });

  it("validation checklist matches popup tabs and has no Flow Inspector steps", () => {
    const section = readmeSection(readme, "## Validation checklist");
    expect(section).toContain("Power Automate");
    expect(section).toContain("Power Apps");
    expect(section).toContain("About");
    expect(section).toMatch(/record form/i);
    expect(section).toMatch(/notification (area|slot|alert)/i);
    expect(section).toMatch(/SettingsInfoAlert|SettingsStatusAlert/i);
    expect(section).toMatch(/SettingsBusyHint|stay enabled/i);
    expect(section).toMatch(/reload the page|Reload the flow or run page/i);
    expect(section).toMatch(/Preference saved\. Reload the page|blue reload hint|still loading/i);
    expect(section).not.toMatch(/radios briefly disable only while/i);
    expect(section).not.toMatch(/specific error such as ["']open a record form/i);
    expect(section).toMatch(/saves to sync|stay selected|stay visible/i);
    expect(section).toMatch(/powerAppsHiddenFields|powerAppsReadOnly/i);
    expect(section).not.toMatch(/no API call/i);
    expect(section).not.toMatch(/not persisted/i);
    expect(section).not.toMatch(/Flow Inspector/i);
    expect(section).not.toMatch(/side panel/i);
  });

  it("Known limitations documents Power Apps record form and status behavior", () => {
    const section = readmeSection(readme, "## Known limitations");
    expect(section).toMatch(/Power Apps/i);
    expect(section).toMatch(/record form/i);
    expect(section).toMatch(/getVisible|setVisible|setDisabled/i);
    expect(section).toMatch(/notification (area|region)|inject/i);
    expect(section).toMatch(/blue reload hint|still loading|Preference saved/i);
    expect(section).not.toMatch(/optional frame count and detail/i);
    expect(section).not.toMatch(/distinguishes ["']open a record form/i);
  });

  it("Implementation notes documents Power Apps MAIN-world injection", () => {
    const section = readmeSection(readme, "## Implementation notes");
    expect(section).toContain("powerAppsFormActionInPage");
    expect(section).toMatch(/MAIN/i);
    expect(section).toContain("inject_no_result");
    expect(section).toMatch(/apply-preferences|persist-powerapps-preference|SCHEDULE_APPLY/i);
    expect(section).toMatch(/powerAppsHiddenFields|powerAppsReadOnly/i);
    expect(section).toMatch(/format-powerapps-preferences|POPUP_ACTIVE_TAB_RETRY_DELAYS_MS/i);
    expect(section).toMatch(/formatPowerAppsActionErrorForNotification|Checked N frames/i);
    expect(section).not.toMatch(/only sends `pp:powerapps:apply-form-action`/i);
  });

  it("repository layout documents powerapps inject and ISOLATED content-powerapps", () => {
    const layout = readmeSection(readme, "## Repository layout");
    expect(layout).toContain("xrm-page-script");
    expect(layout).toContain("inject_no_result");
    expect(layout).toMatch(/ISOLATED|ISOLATED-world/i);
    expect(layout).toContain("apply-preferences");
    expect(layout).toContain("persist-powerapps-preference.ts");
    expect(layout).toContain("powerapps-client.ts");
    expect(layout).toContain("format-powerapps-preferences.ts");
  });

  it("unit tests intro and table cover every tests/*.test.ts file", () => {
    const onDisk = readdirSync(join(repoRoot, "tests"))
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => `tests/${name}`)
      .sort();
    const linked = extractReadmeTestTableLinks(readme).sort();
    expect(linked).toEqual(onDisk);
  });

  it("repository layout documents popup-layout.ts and omits removed inspector paths", () => {
    const layout = readmeSection(readme, "## Repository layout");
    expect(layout).toContain("popup-layout.ts");
    expect(layout).toContain("SettingsChoiceRow");
    expect(layout).toContain("SettingsBusyHint");
    expect(layout).toContain("PopupNotificationRegion");
    expect(layout).toContain("SettingsInfoAlert");
    expect(layout).toContain("SettingsTabPanel");
    expect(layout).toContain("AboutPanel");
    expect(layout).toContain("persist-status-messages.ts");
    expect(readme).toContain("POPUP_SYNC_SETTINGS_KEYS");
    expect(layout).not.toContain("src/inspector");
    expect(layout).not.toContain("FlowInspectorLauncherCard");
    expect(layout).not.toContain("content-main-hook");
    expect(layout).not.toContain("vite.inspector.config");
  });

  it("popup settings components exist on disk", () => {
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsChoiceRow.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsSectionHeader.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsBusyHint.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/PopupNotificationRegion.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsInfoAlert.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/settings-busy-hint.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/popup-layout.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/popup-notification-ui.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/popup-notification-visibility.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/persist-status-messages.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/popup-settings-copy.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsTabPanel.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/AboutPanel.tsx"))).toBe(true);
  });
});

describe("chrome-web-store.md accuracy", () => {
  const doc = readRepoFile("docs/chrome-web-store.md");

  it("smoke test steps match three popup tabs and radio-style Power Apps settings", () => {
    expect(doc).toContain("Power Automate tab");
    expect(doc).toContain("Power Apps tab");
    expect(doc).toContain("About");
    expect(doc).not.toMatch(/Flow Inspector/i);
    expect(doc).toMatch(/Show hidden fields/i);
    expect(doc).toMatch(/Unlock read-only/i);
    expect(doc).toMatch(/record form/i);
    expect(doc).toMatch(/notification (area|slot|region)|SettingsStatusAlert/i);
    expect(doc).toMatch(/SettingsInfoAlert/i);
    expect(doc).toMatch(/Reload the page/i);
    expect(doc).toMatch(/Reload the flow or run page|Reloaded/i);
    expect(doc).toMatch(/SettingsTabPanel|no card frame/i);
    expect(doc).toMatch(/self-contained/i);
    expect(doc).not.toMatch(/\*\*Unhide hidden fields\*\* and \*\*Unlock read-only fields\*\*/);
  });

  it("permission table matches public manifest (no sidePanel or API hosts)", () => {
    const manifest = JSON.parse(readRepoFile("public/manifest.json")) as {
      permissions?: string[];
      host_permissions?: string[];
      minimum_chrome_version?: string;
      action?: { default_icon?: Record<string, string> };
    };
    expect(doc).toContain("`declarativeNetRequest`");
    expect(doc).toContain("`scripting`");
    expect(doc).not.toContain("`sidePanel`");
    expect(manifest.permissions).not.toContain("sidePanel");
    expect(doc).toMatch(/Power Automate hosts/i);
    expect(doc).toMatch(/crm17|\.crm\d*\.dynamics|dynamics\.cn|microsoftdynamics\.de/i);
    expect(doc).toMatch(/apps\.powerapps\.com/i);
    expect(doc).toMatch(
      /learn\.microsoft\.com\/en-us\/power-platform\/admin\/new-datacenter-regions/i,
    );
    expect(doc).not.toContain("https://*.*.dynamics.com/*");
    const apiHosts = ["api.powerplatform.com", "api.bap.microsoft.com", "api.flow.microsoft.com"];
    for (const api of apiHosts) {
      expect(doc).not.toContain(api);
    }
  });

  it("documents Chrome Web Store–only distribution and current manifest polish keys", () => {
    const manifest = JSON.parse(readRepoFile("public/manifest.json")) as {
      minimum_chrome_version?: string;
      action?: { default_icon?: Record<string, string> };
    };
    expect(doc).toMatch(/Chrome Web Store only/i);
    expect(doc).toMatch(/Chromium Edge users can install/i);
    expect(doc).not.toMatch(/Partner Center/i);
    expect(doc).not.toMatch(/upload(?:ing)? to (?:Chrome Web Store or )?Edge Add-ons/i);
    expect(doc).not.toMatch(/Chrome Web Store \/ Edge/i);
    expect(doc).toContain("minimum_chrome_version");
    expect(doc).toContain(manifest.minimum_chrome_version ?? "");
    expect(doc).toContain("action.default_icon");
    expect(manifest.action?.default_icon).toBeDefined();
  });
});

describe("package-dist-zip script copy", () => {
  it("describes Chrome Web Store packaging only (not a separate Edge Add-ons upload)", () => {
    const script = readRepoFile("scripts/package-dist-zip.mjs");
    expect(script).toMatch(/Chrome Web Store/);
    expect(script).not.toMatch(/Chrome Web Store \/ Edge/i);
    expect(script).not.toMatch(/Edge Add-ons/i);
  });
});
