import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEVELOPER_NAME, DEVELOPER_URL, EXTENSION_DISPLAY_NAME } from "../src/popup/about-meta";
import { expectIconExists, extractPublicIconImports } from "./test-helpers/icon-paths";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicIconsDir = join(repoRoot, "public", "icons");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("popup chrome (header + About developer section)", () => {
  it("PopupHeader bundles the ppconfigurator toolbar artwork from assets/", () => {
    const header = readSource("src/popup/components/PopupHeader.tsx");
    expect(header).toContain("ppconfigurator_48.png");
    expect(existsSync(join(repoRoot, "assets", "ppconfigurator_48.png"))).toBe(true);
  });

  it("PopupHeader shows the extension product name and icon, not the developer mark", () => {
    const header = readSource("src/popup/components/PopupHeader.tsx");
    expect(header).toContain("ppconfigurator_48.png");
    expect(header).toContain("EXTENSION_DISPLAY_NAME");
    expect(header).toContain("@helvety/extension-chrome/popup-header");
    expect(header).not.toContain("HelvetyMark");
    expect(header).not.toContain("DEVELOPER_NAME");
  });

  it("App uses PopupHeader for top chrome and keeps HelvetyMark only in the About developer block", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app.match(/<PopupHeader\b/g)?.length).toBe(2);
    expect(app).toContain('id="about-developer-heading"');
    expect(app).toContain("Developer");
    expect(app).toContain("helvety.com");
    expect(app.match(/<HelvetyMark\b/g)?.length).toBe(1);
    expect(app).not.toMatch(/<header[^>]*>[\s\S]*<HelvetyMark/);
  });

  it("popup tabs are Power Automate, Power Apps, and About (not legacy Editor/Survey triggers)", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("Power Automate");
    expect(app).toContain("Power Apps");
    expect(app).toContain('value="power-automate"');
    expect(app).toContain('value="power-apps"');
    expect(app).toContain("<PowerAutomatePanel");
    expect(app).toContain("<PowerAppsPanel");
    expect(app).not.toMatch(/<TabsTrigger[^>]*value="editor"/);
    expect(app).not.toMatch(/<TabsTrigger[^>]*value="survey"/);
  });

  it("shared settings UI modules exist and panels import them", () => {
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsChoiceRow.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsSectionHeader.tsx"))).toBe(true);
    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    for (const source of [paPanel, appsPanel]) {
      expect(source).toContain("SettingsChoiceRow");
      expect(source).toContain("SettingsSectionHeader");
      expect(source).toContain("TAB_PANEL_BODY_CLASS");
      expect(source).toContain("SETTINGS_SECTION_CLASS");
    }
  });

  it("all settings panels use shared SettingsChoiceRow and layout spacing tokens", () => {
    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    const app = readSource("src/popup/App.tsx");
    const choiceRow = readSource("src/popup/components/SettingsChoiceRow.tsx");
    const sectionHeader = readSource("src/popup/components/SettingsSectionHeader.tsx");
    const layout = readSource("src/popup/popup-layout.ts");

    for (const source of [paPanel, appsPanel, app]) {
      expect(source).toContain("@helvety/ui/radio-group");
      expect(source).toContain("SettingsChoiceRow");
      expect(source).toContain("SETTINGS_RADIO_GROUP_CLASS");
      expect(source).not.toContain("popupChoiceRowClass");
      expect(source).not.toContain("@helvety/extension-chrome/popup-shell");
      expect(source).not.toContain("@helvety/ui/button");
      expect(source).not.toContain("<Button");
      expect(source).not.toMatch(/RadioGroup[^>]*\n[^>]*className="flex flex-col gap-1\.5"/);
    }

    expect(sectionHeader).toContain("SETTINGS_SECTION_INTRO_CLASS");
    expect(sectionHeader).toContain("SETTINGS_SECTION_TITLE_CLASS");
    expect(choiceRow).toContain("RadioGroupItem");
    expect(choiceRow).toContain("settingsChoiceRowClass");
    expect(choiceRow).toContain('className="mt-1 shrink-0"');
    expect(layout).toContain("settingsChoiceRowClass");
    expect(layout).toContain("gap-3 rounded-sm p-3");
    expect(layout).toContain("SETTINGS_RADIO_GROUP_CLASS");
    expect(layout).toContain("gap-2");
    expect(layout).toContain("TAB_PANEL_BODY_CLASS");
    expect(layout).toContain("TAB_PANEL_CLASS");
    expect(layout).toContain("pt-1");
    expect(layout).toContain("py-2.5");
    expect(layout).toContain("ABOUT_CARD_HEADER_CLASS");
    expect(layout).toContain("ABOUT_DEVELOPER_LINK_CLASS");

    expect(appsPanel).toContain('value="hide"');
    expect(appsPanel).toContain('value="show"');
    expect(appsPanel).toContain('value="lock"');
    expect(appsPanel).toContain('value="unlock"');
    expect(appsPanel).toContain("persistPowerAppsPreference");
    expect(appsPanel).toContain("requestPowerAppsApplyPreferencesOnActiveTab");
    expect(appsPanel).toContain("formatPowerAppsPreferencesApplyStatus");
    expect(appsPanel).toContain("POWERAPPS_SYNC_KEYS");
    expect(appsPanel).toContain("Separator");
  });

  it("About appearance radios use SettingsChoiceRow (no Sun/Moon between radio and label)", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain('id="theme-light"');
    expect(app).toContain('id="theme-dark"');
    expect(app).toContain("<SettingsChoiceRow");
    expect(app).toContain("<SettingsSectionHeader");
    expect(app).toContain("ABOUT_CARD_HEADER_CLASS");
    expect(app).toContain("ABOUT_CARD_CONTENT_CLASS");
    expect(app).toContain("ABOUT_DEVELOPER_LINK_CLASS");
    expect(app).toContain("SETTINGS_CODE_CLASS");
    expect(app).not.toContain('className="pr-2"');
    expect(app).not.toContain("popupChoiceRowClass");
    expect(app).not.toMatch(/\bSun\b/);
    expect(app).not.toMatch(/\bMoon\b/);
  });

  it("popup flex chain fills height below tabs (host + stacked tab layers)", () => {
    const css = readSource("src/popup/index.css");
    expect(css).toContain("#root");
    expect(css).toContain("h-full");
    expect(css).toContain("min-h-0");
    expect(css).toContain("overflow-hidden");

    const indexHtml = readSource("src/popup/index.html");
    expect(indexHtml).toContain('id="root"');
    expect(indexHtml).toContain("h-full");

    const layout = readSource("src/popup/popup-layout.ts");
    expect(layout).toContain("TAB_PANEL_HOST_CLASS");
    expect(layout).toContain("TAB_CONTENT_CLASS");
    expect(layout).toContain("absolute inset-0");
    expect(layout).toContain("data-[state=inactive]:hidden");
    expect(layout).not.toContain("scrollbar-gutter");

    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("TAB_PANEL_HOST_CLASS");
    expect(app).toContain("TAB_CONTENT_CLASS");
    expect(app).toContain("flex h-0 min-h-0 flex-1");
    expect(app).toContain("flex-shrink-0");
    expect(app.match(/<TabsContent\b/g)?.length).toBe(3);
    expect(app).not.toMatch(/<TabsContent[^>]*\n[^<]*className="mt-2 flex min-h-0 flex-1/);
  });

  it("uses Chrome maximum popup dimensions via popup-layout (not legacy 320px shell)", () => {
    const layout = readSource("src/popup/popup-layout.ts");
    expect(layout).toContain("w-[800px]");
    expect(layout).toContain("h-[600px]");
    expect(layout).toContain("TAB_PANEL_CLASS");
    expect(layout).not.toContain("max-h-72");

    const indexHtml = readSource("src/popup/index.html");
    expect(indexHtml).toContain("w-[800px]");
    expect(indexHtml).toContain("h-[600px]");
    expect(indexHtml).not.toContain("320px");

    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("POPUP_ROOT_CLASS");
    expect(app).toContain("./popup-layout");
    expect(app).not.toContain("POPUP_WIDTH_CLASS");

    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    expect(paPanel).toContain("../popup-layout");
    expect(appsPanel).toContain("../popup-layout");
    expect(paPanel).not.toContain("FlowInspectorLauncherCard");
    expect(paPanel).not.toContain("max-h-72");
    expect(existsSync(join(repoRoot, "src/popup/components/FlowInspectorLauncherCard.tsx"))).toBe(
      false,
    );
    expect(existsSync(join(repoRoot, "src/popup/open-inspector-side-panel.ts"))).toBe(false);
  });

  it("product tab triggers use TabProductIcon, not legacy Lucide product icons", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain('import { TabProductIcon } from "./components/TabProductIcon"');
    expect(app).toContain('<TabProductIcon product="power-automate" />');
    expect(app).toContain('<TabProductIcon product="power-apps" />');
    expect(app).not.toMatch(/<Workflow[^/]*\/>\s*\n\s*<span>Power Automate/);
    expect(app).not.toMatch(/<AppWindow[^/]*\/>\s*\n\s*<span>Power Apps/);
  });

  it("about-meta developer constants match the About developer link", () => {
    expect(DEVELOPER_NAME).toBe("Helvety");
    expect(DEVELOPER_URL).toBe("https://helvety.com");
    expect(EXTENSION_DISPLAY_NAME).toBe("Power Platform Configurator");
  });

  it("popup entry imports shared theme-boot and App uses usePopupTheme", () => {
    const main = readSource("src/popup/main.tsx");
    expect(main).toContain("@helvety/extension-chrome/theme-boot");
    expect(main).not.toContain("./theme-boot");

    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("usePopupTheme");
    expect(app).toContain("STORAGE_KEY_POPUP_THEME");
    expect(app).toContain("@helvety/extension-chrome/use-popup-theme");
  });

  it("does not keep local popup theme modules (shared package owns them)", () => {
    expect(existsSync(join(repoRoot, "src/popup/theme-preference.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "src/popup/theme-boot.ts"))).toBe(false);
  });

  it("ships ppconfigurator PNGs and product tab SVGs under public/icons/", () => {
    const names = readdirSync(publicIconsDir);
    expect(names).toEqual(
      expect.arrayContaining([
        "ppconfigurator_16.png",
        "ppconfigurator_32.png",
        "ppconfigurator_48.png",
        "ppconfigurator_128.png",
      ]),
    );
    const tabIconSource = readSource("src/popup/components/TabProductIcon.tsx");
    const importedSvgs = extractPublicIconImports(tabIconSource);
    expect(importedSvgs).toHaveLength(2);
    for (const svgName of importedSvgs) {
      expectIconExists(publicIconsDir, svgName);
    }
  });
});

describe("built popup bundle (when dist/ exists; enforced in test:dist)", () => {
  const popupAssetsDir = join(repoRoot, "dist", "popup-assets");
  const hasPopupAssets = existsSync(popupAssetsDir);

  it.skipIf(!hasPopupAssets)("includes hashed ppconfigurator icon asset after vite build", () => {
    const assets = readdirSync(popupAssetsDir);
    expect(assets.some((name) => name.includes("ppconfigurator"))).toBe(true);
  });

  it.skipIf(!hasPopupAssets)("bundles product tab SVGs into the popup JS asset", () => {
    const jsFiles = readdirSync(popupAssetsDir).filter((name) => name.endsWith(".js"));
    expect(jsFiles.length).toBeGreaterThan(0);
    const bundled = jsFiles
      .map((name) => readFileSync(join(popupAssetsDir, name), "utf8"))
      .join("\n");
    expect(bundled).toMatch(/Power_Automate_Scalable\.svg|data:image\/svg\+xml/i);
    expect(bundled).toMatch(/Power_Apps_Scalable\.svg|data:image\/svg\+xml/i);
  });
});
