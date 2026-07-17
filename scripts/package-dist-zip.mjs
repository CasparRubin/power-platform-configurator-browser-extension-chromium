// Zip dist/ for Chrome Web Store — manifest.json at archive root (no "./" prefix).
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(repoRoot, "dist");
const manifestPath = path.join(distDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("package-dist-zip: dist/manifest.json missing — run npm run build first.");
  process.exit(1);
}

const version = JSON.parse(fs.readFileSync(manifestPath, "utf8")).version;
const tag = process.argv[2] ?? `v${version}`;
const zipBase = `power-platform-configurator-${tag}.zip`;
const outPath = path.join(repoRoot, zipBase);

function listZipEntries(zipPath) {
  let output;
  if (process.platform === "win32") {
    const ps = [
      "Add-Type -AssemblyName System.IO.Compression.FileSystem",
      `$zip = [System.IO.Compression.ZipFile]::OpenRead(${JSON.stringify(zipPath)})`,
      "try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }",
    ].join("; ");
    output = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
    });
  } else {
    output = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
  }
  return output.split(/\r?\n/).filter(Boolean);
}

fs.rmSync(outPath, { force: true });

if (process.platform === "win32") {
  const ps = [
    `$dist = ${JSON.stringify(distDir)}`,
    `$out = ${JSON.stringify(outPath)}`,
    "Set-Location -LiteralPath $dist",
    "$names = @(Get-ChildItem -Force | ForEach-Object { $_.Name })",
    "Compress-Archive -Path $names -DestinationPath $out -CompressionLevel Optimal -Force",
  ].join("; ");
  execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, {
    stdio: "inherit",
    cwd: repoRoot,
  });
} else {
  execSync(`zip -r ${JSON.stringify(outPath)} .`, { cwd: distDir, stdio: "inherit" });
}

const entries = listZipEntries(outPath);
if (entries.some((entry) => entry.startsWith("./"))) {
  console.error("package-dist-zip: zip contains ./-prefixed entries.");
  process.exit(1);
}
if (!entries.includes("manifest.json")) {
  console.error("package-dist-zip: zip does not contain manifest.json at its root.");
  process.exit(1);
}

console.log(`package-dist-zip: wrote ${zipBase}`);
