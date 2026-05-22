import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
});
