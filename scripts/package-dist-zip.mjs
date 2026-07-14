// Zip dist/ for Chrome Web Store — manifest.json at archive root (no "./" prefix).
import { execSync } from "node:child_process";
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

const buf = fs.readFileSync(outPath);
if (buf.includes(Buffer.from("./manifest.json"))) {
  console.error(
    "package-dist-zip: zip contains ./manifest.json — Chrome Web Store will reject it.",
  );
  process.exit(1);
}
if (!buf.includes(Buffer.from("manifest.json"))) {
  console.error("package-dist-zip: zip does not contain manifest.json.");
  process.exit(1);
}

console.log(`package-dist-zip: wrote ${zipBase}`);
