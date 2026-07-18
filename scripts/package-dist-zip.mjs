// Zip dist/ for Chrome Web Store — manifest.json at archive root (no "./" prefix).
// Entry paths always use forward slashes (APPNOTE / Chrome unpacker); Compress-Archive
// on Windows writes backslashes, which breaks nested assets in the store package.
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

/** PowerShell single-quoted string (backslashes stay literal; unlike JSON double-quotes). */
function psQuote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function listZipEntries(zipPath) {
  let output;
  if (process.platform === "win32") {
    const ps = [
      "Add-Type -AssemblyName System.IO.Compression.FileSystem",
      `$zip = [System.IO.Compression.ZipFile]::OpenRead(${psQuote(zipPath)})`,
      "try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }",
    ].join("; ");
    output = execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
    });
  } else {
    output = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
  }
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"));
}

/** Confirm nested entry names use `/` in the zip bytes (FullName may OS-normalize). */
function zipContainsBackslashPaths(zipPath) {
  const buf = fs.readFileSync(zipPath);
  return buf.includes(Buffer.from("icons\\")) || buf.includes(Buffer.from("popup-assets\\"));
}

fs.rmSync(outPath, { force: true });

if (process.platform === "win32") {
  const ps = `
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$dist = ${psQuote(distDir)}
$out = ${psQuote(outPath)}
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }
$zip = [System.IO.Compression.ZipFile]::Open($out, [System.IO.Compression.ZipArchiveMode]::Create)
$prefix = $dist.TrimEnd([char]92) + [char]92
try {
  Get-ChildItem -LiteralPath $dist -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($prefix.Length).Replace([char]92, [char]47)
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $rel,
      [System.IO.Compression.CompressionLevel]::Optimal
    )
  }
} finally {
  $zip.Dispose()
}
`.trim();
  execFileSync("powershell", ["-NoProfile", "-Command", ps], {
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
if (zipContainsBackslashPaths(outPath)) {
  console.error("package-dist-zip: zip contains backslash entry paths.");
  process.exit(1);
}
if (!entries.includes("manifest.json")) {
  console.error("package-dist-zip: zip does not contain manifest.json at its root.");
  process.exit(1);
}

console.log(`package-dist-zip: wrote ${zipBase}`);
