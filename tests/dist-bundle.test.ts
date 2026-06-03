import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { expectIconExists } from "./test-helpers/icon-paths";

/**
 * Post-build checks (run via `npm run test:dist` after `npm run build`).
 * Fails fast if `dist/` is missing so CI cannot silently skip CSP guards.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const popupHtmlPath = join(repoRoot, "dist", "popup.html");
const inspectorHtmlPath = join(repoRoot, "dist", "inspector.html");
const popupAssetsDir = join(repoRoot, "dist", "popup-assets");
const inspectorAssetsDir = join(repoRoot, "dist", "inspector-assets");

describe("dist/ bundle (post-build)", () => {
  it("exists and includes packaged static assets", () => {
    expect(existsSync(popupHtmlPath)).toBe(true);
    expect(existsSync(inspectorHtmlPath)).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-classic-editor.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-new-designer.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "manifest.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "content-powerapps.js"))).toBe(true);
  });

  it("copies product tab SVGs from public/icons into dist/icons", () => {
    const distIconsDir = join(repoRoot, "dist", "icons");
    expect(existsSync(distIconsDir)).toBe(true);
    expectIconExists(distIconsDir, "Power_Automate_Scalable.svg");
    expectIconExists(distIconsDir, "Power_Apps_Scalable.svg");
  });

  it("popup.html has no inline script and no remote script URLs (MV3 CSP)", () => {
    const html = readFileSync(popupHtmlPath, "utf8");
    const scriptWithoutSrc = /<script(?![^>]*\bsrc=)[^>]*>/i;
    expect(html).not.toMatch(scriptWithoutSrc);
    expect(html).not.toMatch(/<script[^>]+src=["'](https?:)/i);
  });

  it("popup-assets includes hashed ppconfigurator icon from vite build", () => {
    expect(existsSync(popupAssetsDir)).toBe(true);
    const assets = readdirSync(popupAssetsDir);
    expect(assets.some((name) => name.includes("ppconfigurator"))).toBe(true);
  });

  it("inspector.html inlines CSS and uses a local module script (side panel)", () => {
    const html = readFileSync(inspectorHtmlPath, "utf8");
    expect(html).not.toMatch(/ crossorigin/i);
    expect(html).toContain("<style>");
    expect(html).not.toMatch(/<link rel="stylesheet" href="\.\/inspector-assets\//);
    expect(html).toMatch(/<script type="module" src="\.\/inspector-assets\//);
    expect(html).not.toMatch(/<script[^>]+src=["'](https?:)/i);
    expect(html).not.toMatch(/name="viewport"/i);
  });

  it("inspector-assets exists after vite build", () => {
    expect(existsSync(inspectorAssetsDir)).toBe(true);
  });
});
