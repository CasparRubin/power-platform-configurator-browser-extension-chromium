import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "..");
const distManifest = join(repoRoot, "dist", "manifest.json");

function listFiles(root: string, relative = ""): string[] {
  return fs.readdirSync(join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(root, path) : [path];
  });
}

/** PowerShell single-quoted string (backslashes stay literal). */
function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function listZipEntries(zipPath: string): string[] {
  if (process.platform === "win32") {
    const ps = [
      "Add-Type -AssemblyName System.IO.Compression.FileSystem",
      `$zip = [System.IO.Compression.ZipFile]::OpenRead(${psQuote(zipPath)})`,
      "try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }",
    ].join("; ");
    return execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .filter(Boolean)
      .map((entry) => entry.replaceAll("\\", "/"));
  }
  return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

/** .NET FullName may OS-normalize separators; inspect zip bytes for real entry names. */
function zipBytesContainBackslashPaths(zipPath: string): boolean {
  const buf = fs.readFileSync(zipPath);
  return buf.includes(Buffer.from("icons\\")) || buf.includes(Buffer.from("popup-assets\\"));
}

describe("package-dist-zip.mjs", () => {
  const zipPath = join(repoRoot, "power-platform-configurator-vtest.zip");

  afterAll(() => {
    fs.rmSync(zipPath, { force: true });
  });

  it("packages every dist file with manifest.json exactly at the archive root", () => {
    if (!fs.existsSync(distManifest)) {
      throw new Error("dist/ missing — run npm run build before test:dist:built");
    }
    execSync("node scripts/package-dist-zip.mjs vtest", {
      cwd: repoRoot,
      stdio: "pipe",
    });
    const entries = listZipEntries(zipPath);
    expect(entries).toContain("manifest.json");
    expect(entries.every((entry) => !entry.startsWith("./"))).toBe(true);
    expect(zipBytesContainBackslashPaths(zipPath)).toBe(false);
    expect(entries).toContain("icons/ppconfigurator_48.png");
    expect(entries.some((entry) => entry.startsWith("popup-assets/"))).toBe(true);
    expect(entries.filter((entry) => !entry.endsWith("/")).sort()).toEqual(
      listFiles(join(repoRoot, "dist")).sort(),
    );
  });
});
