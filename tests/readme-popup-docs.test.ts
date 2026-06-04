import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readmeSection(readme: string, heading: string): string {
  const start = readme.indexOf(heading);
  if (start === -1) {
    return "";
  }
  const after = readme.slice(start + heading.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading === -1 ? after : after.slice(0, nextHeading);
}

describe("README popup and icon documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  it("documents ppconfigurator icons and popup chrome in What it does", () => {
    const section = readmeSection(readme, "## What it does");
    expect(section).toContain("ppconfigurator");
    expect(section).toContain("PopupHeader");
    expect(section).toContain("@helvety/extension-chrome");
    expect(section).toContain("usePopupTheme");
    expect(section).toMatch(/About.*Developer/i);
    expect(section).toContain("Power Automate");
    expect(section).toContain("Power Apps");
    expect(section).toMatch(
      /Hide hidden fields|Show hidden fields|\*\*Hide\*\*.*hidden fields|\*\*Show\*\*.*hidden fields/i,
    );
    expect(section).toMatch(
      /Lock read-only|Unlock read-only|\*\*Lock\*\*.*read-only|\*\*Unlock\*\*.*read-only/i,
    );
    expect(section).not.toMatch(/action buttons on an open model-driven/i);
    expect(section).not.toMatch(/one-shot\s+\*\*Unhide hidden fields\*\*/i);
    expect(section).toMatch(/800\s*[×x]\s*600|800×600/i);
    expect(section).toContain("SettingsChoiceRow");
    expect(section).toContain("popup-layout.ts");
    expect(section).not.toMatch(/Tabs:\s*\*\*Editor\*\*/);
    expect(section).not.toContain("Flow Inspector");
    expect(section).not.toContain("FlowInspectorLauncherCard");
  });

  it("layout and unit-test tables document popup components and icon paths", () => {
    const fromUnitTests = readme.slice(readme.indexOf("## Unit tests"));
    expect(fromUnitTests).toContain("tests/popup-chrome.test.ts");
    expect(fromUnitTests).toContain("tests/readme-popup-docs.test.ts");

    const layout = readmeSection(readme, "## Repository layout");
    expect(layout).toContain("ppconfigurator_{16,32,48,128}.png");
    expect(layout).toContain("TabProductIcon");
    expect(layout).toContain("Power_Automate_Scalable.svg");
    expect(layout).toContain("content-powerapps.ts");
    expect(existsSync(join(repoRoot, "src/popup/popup-layout.ts"))).toBe(true);
    expect(layout).toContain("@helvety/extension-chrome");
    expect(layout).not.toContain("ExtensionMark");
    expect(layout).not.toContain("FlowInspectorLauncherCard");
    expect(layout).not.toContain("src/inspector");
    expect(layout).toContain("HelvetyMark");
    expect(readme).not.toMatch(/icon_\d+\.png/);
    expect(readme).not.toContain("v3False");
    expect(readme).toContain("docs/chrome-web-store.md");
    expect(readme).toContain("popup-layout.ts");
    expect(readme).toContain("TAB_PANEL_HOST_CLASS");
    expect(layout).toContain("SettingsChoiceRow");
    expect(layout).toContain("settingsChoiceRowClass");
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsChoiceRow.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsSectionHeader.tsx"))).toBe(true);
  });

  it("popup-chrome suite guards shared settings spacing and choice rows", () => {
    const chrome = readFileSync(join(repoRoot, "tests/popup-chrome.test.ts"), "utf8");
    expect(chrome).toContain("SettingsChoiceRow");
    expect(chrome).toContain("settingsChoiceRowClass");
    expect(chrome).toContain("TAB_PANEL_BODY_CLASS");
    expect(chrome).toContain("ABOUT_CARD_HEADER_CLASS");
    expect(chrome).not.toContain("popupChoiceRowClass(themePreference");
  });
});
