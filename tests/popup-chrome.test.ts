import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEVELOPER_NAME, DEVELOPER_URL, EXTENSION_DISPLAY_NAME } from "../src/popup/about-meta";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

  it("does not ship legacy icon_* filenames under public/icons/", () => {
    const iconDir = join(repoRoot, "public", "icons");
    const names = readdirSync(iconDir);
    expect(names.every((name) => name.startsWith("ppconfigurator_"))).toBe(true);
    expect(names).toEqual(
      expect.arrayContaining([
        "ppconfigurator_16.png",
        "ppconfigurator_32.png",
        "ppconfigurator_48.png",
        "ppconfigurator_128.png",
      ]),
    );
  });
});

describe("built popup bundle (when dist/ exists; enforced in test:dist)", () => {
  const popupAssetsDir = join(repoRoot, "dist", "popup-assets");
  const hasPopupAssets = existsSync(popupAssetsDir);

  it.skipIf(!hasPopupAssets)("includes hashed ppconfigurator icon asset after vite build", () => {
    const assets = readdirSync(popupAssetsDir);
    expect(assets.some((name) => name.includes("ppconfigurator"))).toBe(true);
  });
});
