import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { expectIconExists } from "./test-helpers/icon-paths";

/**
 * Post-build checks run directly through `test:dist:built`; `test:dist` performs the build first.
 * Fails fast if `dist/` is missing so local release checks cannot skip CSP guards.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const popupHtmlPath = join(repoRoot, "dist", "popup.html");
const popupAssetsDir = join(repoRoot, "dist", "popup-assets");

function listDistFiles(relative = ""): string[] {
  const directory = join(repoRoot, "dist", relative);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listDistFiles(path) : [path];
  });
}

describe("dist/ bundle (post-build)", () => {
  it("exists and includes packaged static assets", () => {
    expect(existsSync(popupHtmlPath)).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-classic-editor.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "dnr-new-designer.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "manifest.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "background.js"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "content-powerapps.js"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "content.js"))).toBe(true);
  });

  it("ships only the expected executable entry points", () => {
    const executableFiles = listDistFiles().filter((path) => /\.(html|js)$/.test(path));
    const rootExecutables = executableFiles.filter((path) => !path.startsWith("popup-assets/"));
    const popupChunks = executableFiles.filter((path) => path.startsWith("popup-assets/"));

    expect(rootExecutables.sort()).toEqual(
      ["background.js", "content-powerapps.js", "content.js", "popup.html"].sort(),
    );
    expect(popupChunks.length).toBeGreaterThan(0);
    expect(popupChunks.every((path) => /^popup-assets\/[^/]+\.js$/.test(path))).toBe(true);
  });

  it("copies product tab SVGs from public/icons into dist/icons", () => {
    const distIconsDir = join(repoRoot, "dist", "icons");
    expect(existsSync(distIconsDir)).toBe(true);
    expectIconExists(distIconsDir, "Power_Automate_Scalable.svg");
    expectIconExists(distIconsDir, "Power_Apps_Scalable.svg");
  });

  it("bundles the popup header and product icons", () => {
    const assets = readdirSync(popupAssetsDir);
    expect(assets.some((name) => name.includes("ppconfigurator"))).toBe(true);

    const bundled = assets
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFileSync(join(popupAssetsDir, name), "utf8"))
      .join("\n");
    expect(bundled).toMatch(/Power_Automate_Scalable\.svg|data:image\/svg\+xml/i);
    expect(bundled).toMatch(/Power_Apps_Scalable\.svg|data:image\/svg\+xml/i);
  });

  it("popup.html has no inline script and no remote script URLs (MV3 CSP)", () => {
    const html = readFileSync(popupHtmlPath, "utf8");
    const scriptWithoutSrc = /<script(?![^>]*\bsrc=)[^>]*>/i;
    expect(html).not.toMatch(scriptWithoutSrc);
    expect(html).not.toMatch(/<script[^>]+src=["'](https?:)/i);
    expect(html).toMatch(/w-\[800px\]/);
    expect(html).toMatch(/h-\[600px\]/);
  });

  it("dist manifest exactly matches public manifest", () => {
    const publicManifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
    ) as {
      minimum_chrome_version?: string;
      host_permissions?: string[];
      action?: { default_icon?: Record<string, string> };
      icons?: Record<string, string>;
      content_scripts?: Array<{ js?: string[]; matches?: string[]; world?: string }>;
    };
    const distManifest = JSON.parse(
      readFileSync(join(repoRoot, "dist", "manifest.json"), "utf8"),
    ) as {
      minimum_chrome_version?: string;
      permissions?: string[];
      host_permissions?: string[];
      action?: { default_icon?: Record<string, string> };
      icons?: Record<string, string>;
      side_panel?: unknown;
      content_scripts?: Array<{ js?: string[]; matches?: string[]; world?: string }>;
    };
    expect(distManifest).toEqual(publicManifest);
    expect(distManifest.side_panel).toBeUndefined();
    expect(distManifest.permissions).not.toContain("sidePanel");
    expect(distManifest.minimum_chrome_version).toBe(publicManifest.minimum_chrome_version);
    expect(distManifest.minimum_chrome_version).toBe("111");
    expect(distManifest.action?.default_icon).toEqual(publicManifest.action?.default_icon);
    expect(distManifest.action?.default_icon).toEqual(distManifest.icons);
    for (const relativePath of Object.values(distManifest.action?.default_icon ?? {})) {
      expect(existsSync(join(repoRoot, "dist", relativePath))).toBe(true);
    }
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
    expect(scripts.flatMap((script) => script.js ?? []).sort()).toEqual(
      ["content-powerapps.js", "content.js"].sort(),
    );
    expect(scripts.every((s) => s.world !== "MAIN")).toBe(true);
  });

  it("compiled popup CSS includes active-tab and reduced-motion behavior", () => {
    const cssFiles = readdirSync(popupAssetsDir).filter((name) => name.endsWith(".css"));
    expect(cssFiles).toHaveLength(1);
    const css = cssFiles.map((name) => readFileSync(join(popupAssetsDir, name), "utf8")).join("\n");

    // Base UI emits the boolean `data-active` attribute. These generated selectors prove
    // Tailwind compiled the arbitrary attribute variants rather than silently dropping them.
    expect(css).toContain(".data-\\[active\\]\\:bg-background[data-active]");
    expect(css).toContain(".data-\\[active\\]\\:font-semibold[data-active]");
    expect(css).toContain(".data-\\[active\\]\\:after\\:opacity-100[data-active]:after");

    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain("transition-duration:.01ms!important");
  });
});
