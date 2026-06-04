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
const popupAssetsDir = join(repoRoot, "dist", "popup-assets");

describe("dist/ bundle (post-build)", () => {
  it("exists and includes packaged static assets", () => {
    expect(existsSync(popupHtmlPath)).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-classic-editor.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-new-designer.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "manifest.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "content-powerapps.js"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "content.js"))).toBe(true);
  });

  it("does not ship Flow Inspector or content-main-hook artifacts", () => {
    expect(existsSync(join(repoRoot, "dist", "inspector.html"))).toBe(false);
    expect(existsSync(join(repoRoot, "dist", "inspector-assets"))).toBe(false);
    expect(existsSync(join(repoRoot, "dist", "content-main-hook.js"))).toBe(false);
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
    expect(html).toMatch(/w-\[800px\]/);
    expect(html).toMatch(/h-\[600px\]/);
  });

  it("dist manifest matches public manifest (no side panel or inspector hosts)", () => {
    const publicManifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
    ) as {
      host_permissions?: string[];
      content_scripts?: Array<{ js?: string[]; matches?: string[]; world?: string }>;
    };
    const distManifest = JSON.parse(
      readFileSync(join(repoRoot, "dist", "manifest.json"), "utf8"),
    ) as {
      permissions?: string[];
      host_permissions?: string[];
      side_panel?: unknown;
      content_scripts?: Array<{ js?: string[]; matches?: string[]; world?: string }>;
    };
    expect(distManifest.side_panel).toBeUndefined();
    expect(distManifest.permissions).not.toContain("sidePanel");
    expect(distManifest.host_permissions?.sort()).toEqual(
      [...(publicManifest.host_permissions ?? [])].sort(),
    );
    expect(distManifest.host_permissions).toContain("https://*.crm17.dynamics.com/*");
    expect(distManifest.host_permissions).toContain("https://*.crm.dynamics.cn/*");
    expect(distManifest.host_permissions).not.toContain("https://*.*.dynamics.com/*");
    expect(distManifest.host_permissions).not.toEqual(
      expect.arrayContaining([
        "https://api.powerplatform.com/*",
        "https://api.bap.microsoft.com/*",
        "https://api.flow.microsoft.com/*",
      ]),
    );
    const publicPowerApps = publicManifest.content_scripts?.find((s) =>
      s.js?.includes("content-powerapps.js"),
    );
    const distPowerApps = distManifest.content_scripts?.find((s) =>
      s.js?.includes("content-powerapps.js"),
    );
    expect(distPowerApps?.matches?.sort()).toEqual(publicPowerApps?.matches?.sort());
    const scripts = distManifest.content_scripts ?? [];
    expect(scripts).toHaveLength(2);
    expect(scripts.some((s) => s.js?.includes("content-main-hook.js"))).toBe(false);
    expect(scripts.every((s) => s.world !== "MAIN")).toBe(true);
  });

  it("popup-assets includes hashed ppconfigurator icon from vite build", () => {
    expect(existsSync(popupAssetsDir)).toBe(true);
    const assets = readdirSync(popupAssetsDir);
    expect(assets.some((name) => name.includes("ppconfigurator"))).toBe(true);
  });
});
