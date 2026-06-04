import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const SHARED_SETTINGS_COMPONENTS = [
  "src/popup/components/SettingsTabPanel.tsx",
  "src/popup/components/SettingsDeveloperLink.tsx",
  "src/popup/components/SettingsMutedList.tsx",
  "src/popup/components/SettingsTextLink.tsx",
] as const;

describe("shared settings tab shell and About building blocks", () => {
  it.each(SHARED_SETTINGS_COMPONENTS)("%s exists", (relativePath) => {
    expect(existsSync(join(repoRoot, relativePath))).toBe(true);
  });

  it("SettingsTabPanel wires popup-layout scroll classes", () => {
    const panel = readSource("src/popup/components/SettingsTabPanel.tsx");
    expect(panel).toContain("TAB_PANEL_CLASS");
    expect(panel).toContain("TAB_PANEL_BODY_CLASS");
  });

  it("AboutPanel uses shared shell without card borders or separators", () => {
    const about = readSource("src/popup/components/AboutPanel.tsx");
    expect(about).toContain("SettingsTabPanel");
    expect(about).toContain("SettingsDeveloperLink");
    expect(about).toContain("SettingsMutedList");
    expect(about).toContain("SettingsTextLink");
    expect(about).not.toContain("@helvety/ui/card");
    expect(about).not.toContain("Separator");
  });
});

describe("Power Automate panel copy", () => {
  const panel = readSource("src/popup/components/PowerAutomatePanel.tsx");

  it("uses compact v3 query flag descriptions on designer rows", () => {
    expect(panel).toContain("v3=false");
    expect(panel).toContain("v3=true");
    expect(panel).not.toMatch(/Rewritten links use/i);
  });

  it("documents reload expectations in section copy", () => {
    expect(panel).toMatch(/reloads an open flow or run page when possible/i);
    expect(panel).toMatch(/reload the page yourself/i);
    expect(panel).toMatch(/Reload the flow or run page after changing/i);
  });

  it("uses SettingsTabPanel and no section separators", () => {
    expect(panel).toContain("SettingsTabPanel");
    expect(panel).not.toContain("Separator");
  });
});

describe("Power Apps panel reload copy", () => {
  const panel = readSource("src/popup/components/PowerAppsPanel.tsx");

  it("tells users to reload the page when turning enforcement off", () => {
    expect(panel).toMatch(/reload the\s+page on open record forms/i);
    expect(panel).toMatch(/Reload the page to restore/i);
    expect(panel).not.toMatch(/Reload the form to restore/i);
  });
});

describe("persist-policy-preference status selection", () => {
  const persist = readSource("src/popup/persist-policy-preference.ts");

  it("maps reload outcomes to shared status strings", () => {
    expect(persist).toContain("POWER_AUTOMATE_PERSIST_STATUS.saved");
    expect(persist).toContain("POWER_AUTOMATE_PERSIST_STATUS.savedReloaded");
    expect(persist).toContain("POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage");
    expect(persist).toContain('reloadPreference === "off"');
    expect(persist).toContain("tabReloaded");
  });
});

describe("powerapps-client error copy", () => {
  it("asks users to reload the page on inject failures", () => {
    const client = readSource("src/popup/powerapps-client.ts");
    expect(client).toMatch(/Reload the page and try again/i);
    expect(client).not.toMatch(/Reload the form tab/i);
  });
});

describe("status strings stay aligned with persist modules", () => {
  it("persist-policy-preference imports Power Automate status constants", () => {
    expect(readSource("src/popup/persist-policy-preference.ts")).toContain(
      "POWER_AUTOMATE_PERSIST_STATUS",
    );
  });

  it("persist-powerapps-preference imports Power Apps status constants", () => {
    expect(readSource("src/popup/persist-powerapps-preference.ts")).toContain(
      "POWER_APPS_PERSIST_STATUS",
    );
  });

  it("persist modules reference reload outcome status constants", () => {
    expect(readSource("src/popup/persist-policy-preference.ts")).toContain(
      "POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage",
    );
    expect(readSource("src/popup/persist-powerapps-preference.ts")).toContain(
      "POWER_APPS_PERSIST_STATUS.saved",
    );
  });
});
