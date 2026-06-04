import { execSync } from "node:child_process";
import fs from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..");
const distManifest = join(repoRoot, "dist", "manifest.json");

describe("package-dist-zip.mjs", () => {
  const zipPath = join(repoRoot, "power-platform-configurator-vtest.zip");

  afterAll(() => {
    fs.rmSync(zipPath, { force: true });
  });

  it("writes manifest.json at zip root (not ./manifest.json)", () => {
    if (!fs.existsSync(distManifest)) {
      throw new Error("dist/ missing — run npm run build before test:dist");
    }
    execSync("node scripts/package-dist-zip.mjs vtest", {
      cwd: repoRoot,
      stdio: "pipe",
    });
    const buf = fs.readFileSync(zipPath);
    expect(buf.includes(Buffer.from("manifest.json"))).toBe(true);
    expect(buf.includes(Buffer.from("./manifest.json"))).toBe(false);
  });
});
