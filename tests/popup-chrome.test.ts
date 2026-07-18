import { existsSync, readFileSync } from "node:fs";
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

describe("popup shell, settings, header, and About section", () => {
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
    const about = readSource("src/popup/components/AboutPanel.tsx");
    expect(app.match(/<PopupHeader\b/g)?.length).toBe(2);
    expect(app).toContain("<AboutPanel");
    expect(about).toContain("Developer");
    expect(about).toContain("helvety.com");
    expect(about).toContain("SettingsDeveloperLink");
    expect(app.match(/<HelvetyMark\b/g)?.length ?? 0).toBe(0);
    expect(about.match(/<HelvetyMark\b/g)?.length).toBe(1);
    expect(app).not.toMatch(/<header[^>]*>[\s\S]*<HelvetyMark/);
  });

  it("App reads extension version via lazy useState (not setState-in-effect)", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain('from "@helvety/extension-chrome/extension-version"');
    expect(app).toMatch(/useState\(\(\)\s*=>\s*readExtensionVersion\(\)\)/);
    expect(app).not.toContain("setExtensionVersion");
    expect(app).not.toMatch(/useEffect\(\(\)\s*=>\s*\{\s*setExtensionVersion/);
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
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsTabPanel.tsx"))).toBe(true);
    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    const aboutPanel = readSource("src/popup/components/AboutPanel.tsx");
    for (const source of [paPanel, appsPanel, aboutPanel]) {
      expect(source).toContain("SettingsChoiceRow");
      expect(source).toContain("SettingsSectionHeader");
      expect(source).toContain("SettingsTabPanel");
      expect(source).toContain("SETTINGS_SECTION_CLASS");
    }
  });

  it("all settings panels use shared SettingsChoiceRow and layout spacing tokens", () => {
    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    const aboutPanel = readSource("src/popup/components/AboutPanel.tsx");
    const choiceRow = readSource("src/popup/components/SettingsChoiceRow.tsx");
    const sectionHeader = readSource("src/popup/components/SettingsSectionHeader.tsx");
    const tabPanel = readSource("src/popup/components/SettingsTabPanel.tsx");
    const layout = readSource("src/popup/popup-layout.ts");
    const app = readSource("src/popup/App.tsx");

    for (const source of [paPanel, appsPanel, aboutPanel]) {
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
    expect(sectionHeader).toContain("SettingsInfoAlert");
    expect(sectionHeader).toContain("hideBusyHint");
    expect(tabPanel).toContain("TAB_PANEL_BODY_CLASS");
    expect(tabPanel).toContain("TAB_PANEL_CLASS");
    expect(choiceRow).toContain("RadioGroupItem");
    expect(choiceRow).toContain("settingsChoiceRowClass");
    expect(choiceRow).toContain("SETTINGS_CHOICE_RADIO_CLASS");
    expect(choiceRow).toMatch(/<Label className=\{settingsChoiceRowClass/);
    expect(layout).toContain("settingsChoiceRowClass");
    expect(layout).toContain("SETTINGS_CHOICE_RADIO_CLASS");
    expect(layout).toContain("border-primary/40");
    expect(layout).toContain("gap-3 rounded-none border p-3");
    expect(layout).toContain("SETTINGS_RADIO_GROUP_CLASS");
    expect(layout).toContain("gap-2");
    expect(layout).toContain("TAB_PANEL_BODY_CLASS");
    expect(layout).toContain("TAB_PANEL_CLASS");
    expect(layout).toContain("pt-1");
    expect(layout).toContain("py-3");
    expect(layout).toContain("SETTINGS_DEVELOPER_LINK_CLASS");
    expect(layout).toContain("SETTINGS_MUTED_LIST_CLASS");

    expect(appsPanel).toContain('value="hide"');
    expect(appsPanel).toContain('value="show"');
    expect(appsPanel).toContain('value="lock"');
    expect(appsPanel).toContain('value="unlock"');
    expect(appsPanel).toContain("persistPowerAppsPreference");
    expect(appsPanel).toContain("formatPowerAppsPreferencesApplyStatus");
    expect(appsPanel).toContain("SettingsBusyHint");
    expect(appsPanel).toContain("hideBusyHint");
    expect(appsPanel).not.toContain("disabled={");
    expect(appsPanel).not.toContain("statusClearTimerRef");
    expect(appsPanel).toContain("SettingsTabPanel");
    expect(appsPanel).not.toContain("Separator");

    expect(app).toContain("POPUP_SYNC_SETTINGS_KEYS");
    expect(app).toContain("settingsLoaded");
    expect(app).toContain("onHiddenModeChange={setHiddenMode}");
    expect(app).toContain("PopupNotificationRegion");
    expect(app).toContain("shouldShowPopupTabNotification");
    expect(app).toContain("powerAutomateStatus");
    expect(app).toContain("powerAppsStatusMessage");
    expect(app).toContain("powerAppsStatusVariant");
    expect(app).toContain("variant={powerAppsStatusVariant}");
    expect(app).not.toContain('defaultValue="power-automate"');
    expect(paPanel).toContain("SettingsBusyHint");
    expect(paPanel).toContain("hideBusyHint");
    expect(paPanel).not.toContain("disabled={");
  });

  it("About appearance radios use SettingsChoiceRow (no Sun/Moon between radio and label)", () => {
    const about = readSource("src/popup/components/AboutPanel.tsx");
    expect(about).toContain('id="theme-light"');
    expect(about).toContain('id="theme-dark"');
    expect(about).toContain("<SettingsChoiceRow");
    expect(about).toContain("<SettingsSectionHeader");
    expect(about).toContain("SettingsTabPanel");
    expect(about).toContain("SettingsDeveloperLink");
    expect(about).toContain("SETTINGS_CODE_CLASS");
    expect(about).not.toContain("@helvety/ui/card");
    expect(about).not.toContain("Separator");
    expect(about).not.toContain("popupChoiceRowClass");
    expect(about).not.toMatch(/\bSun\b/);
    expect(about).not.toMatch(/\bMoon\b/);
  });

  it("popup flex chain fills height below tabs (host + stacked tab layers)", () => {
    const css = readSource("src/popup/index.css");
    expect(css).toContain("#root");
    expect(css).toContain("h-full");
    expect(css).toContain("min-h-0");
    expect(css).toContain("overflow-hidden");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("transition-duration: 0.01ms !important");

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

  it("uses one fixed Chrome action-popup viewport with a fill-size app shell", () => {
    const layout = readSource("src/popup/popup-layout.ts");
    expect(layout).toContain("h-full");
    expect(layout).toContain("w-full");
    expect(layout).not.toContain("w-[800px]");
    expect(layout).not.toContain("h-[600px]");
    expect(layout).toContain("TAB_PANEL_CLASS");
    expect(layout).not.toContain("max-h-72");

    const indexHtml = readSource("src/popup/index.html");
    expect(indexHtml).toContain("w-[800px]");
    expect(indexHtml).toContain("h-[600px]");
    expect(indexHtml).not.toContain("320px");

    // Body sizing lives only in index.html — Tailwind must scan HTML or those utilities
    // are dropped and the popup collapses to Chrome's minimum size.
    const tailwindConfig = readSource("tailwind.config.js");
    expect(tailwindConfig).toMatch(/["'].*src\/popup\/\*\*\/\*\.\{html,/);
    expect(tailwindConfig).toMatch(/\.\{html,ts,tsx\}["']/);

    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("POPUP_ROOT_CLASS");
    expect(app).toContain("TAB_TRIGGER_CLASS");
    expect(app).toContain("data-[active]:after:opacity-100");
    expect(app).toContain("POPUP_NOTIFICATION_SLOT_CLASS");
    expect(app).toContain("./popup-layout");
    expect(app).not.toContain("POPUP_WIDTH_CLASS");

    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    expect(paPanel).toContain("../popup-layout");
    expect(appsPanel).toContain("../popup-layout");
    expect(paPanel).not.toContain("max-h-72");
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

  it("ships product tab SVGs under public/icons/", () => {
    const tabIconSource = readSource("src/popup/components/TabProductIcon.tsx");
    const importedSvgs = extractPublicIconImports(tabIconSource);
    expect(importedSvgs).toHaveLength(2);
    for (const svgName of importedSvgs) {
      expectIconExists(publicIconsDir, svgName);
    }
  });
});

describe("settings UX (choice rows, preload, busy hints)", () => {
  it("SettingsChoiceRow uses a full-row Label (no nested htmlFor title-only label)", () => {
    const choiceRow = readSource("src/popup/components/SettingsChoiceRow.tsx");
    expect(choiceRow).toMatch(/<Label className=\{settingsChoiceRowClass/);
    expect(choiceRow).not.toContain("htmlFor=");
    expect(choiceRow).not.toMatch(/<div className=\{settingsChoiceRowClass/);
  });

  it("App preloads policy and Power Apps prefs in one sync read", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("POPUP_SYNC_SETTINGS_KEYS");
    expect(app).toContain("parsePowerAppsPreferencesFromSync");
    expect(app).toContain("settingsLoaded");
    expect(app).not.toContain("policyLoaded");
    expect(app).toMatch(
      /chrome\.storage\.sync\s*\n?\s*\.get\(\[\.\.\.POPUP_SYNC_SETTINGS_KEYS\]\)/,
    );
  });

  it("PowerAppsPanel is controlled from App and does not load sync on mount", () => {
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    expect(appsPanel).toContain("hiddenMode:");
    expect(appsPanel).toContain("onHiddenModeChange");
    expect(appsPanel).toContain("onReadOnlyModeChange");
    expect(appsPanel).toContain("powerAppsPanelBusyMode");
    expect(appsPanel).toContain("setIsApplying");
    expect(appsPanel).not.toContain("prefsLoaded");
    expect(appsPanel).not.toContain("POWERAPPS_SYNC_KEYS");
    expect(appsPanel).not.toMatch(/chrome\.storage\.sync/);
    expect(appsPanel).not.toContain("disabled={");
  });

  it("product settings panels wire SettingsBusyHint into every section header", () => {
    const paPanel = readSource("src/popup/components/PowerAutomatePanel.tsx");
    const appsPanel = readSource("src/popup/components/PowerAppsPanel.tsx");
    expect(paPanel.match(/<SettingsBusyHint mode=\{busyMode\} \/>/g)?.length).toBe(2);
    expect(appsPanel.match(/<SettingsBusyHint mode=\{busyMode\} \/>/g)?.length).toBe(2);
    expect(paPanel).toContain("policyPanelBusyMode");
  });
});

describe("popup notifications (region, alerts, lifted status)", () => {
  it("notification modules exist and App wires the shared region", () => {
    expect(existsSync(join(repoRoot, "src/popup/components/ui/alert.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/PopupNotificationRegion.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(repoRoot, "tests/popup-notification-ui.test.ts"))).toBe(true);
    expect(existsSync(join(repoRoot, "tests/popup-notification-visibility.test.ts"))).toBe(true);

    const app = readSource("src/popup/App.tsx");
    expect(readSource("src/popup/components/PopupNotificationRegion.tsx")).toContain(
      "POPUP_NOTIFICATION_REGION_CLASS",
    );
    expect(app).not.toMatch(/<Loader2[\s\S]{0,80}powerAutomateStatus/);
  });

  it("PowerAppsPanel source has no inline status region; persist uses shared message constants", () => {
    const panel = readSource("src/popup/components/PowerAppsPanel.tsx");
    expect(panel).toContain("setStatus:");
    expect(panel).not.toContain("<PopupNotificationRegion");
    expect(panel).not.toMatch(/role="status"/);

    expect(readSource("src/popup/persist-powerapps-preference.ts")).toContain(
      "POWER_APPS_PERSIST_STATUS",
    );
    expect(readSource("src/popup/persist-policy-preference.ts")).toContain(
      "POWER_AUTOMATE_PERSIST_STATUS",
    );
  });
});
