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
