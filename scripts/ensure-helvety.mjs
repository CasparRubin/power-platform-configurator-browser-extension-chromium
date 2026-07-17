/**
 * Ensures `file:.helvety/packages/*` paths exist before npm resolves dependencies.
 * Copies from sibling `../helvety` when present, otherwise shallow-clones into `.helvety/`.
 * Never symlinks into the monorepo (avoids mutating sibling package.json during npm patch).
 * Skips `node_modules` / build caches so Bun workspace symlinks are not vendored.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sibling = path.resolve(root, "..", "helvety");
const vendor = path.join(root, ".helvety");
const vendorPackages = path.join(vendor, "packages");
const siblingPackages = path.join(sibling, "packages");
const repo = "https://github.com/CasparRubin/helvety.git";

const requiredPackages = ["shared", "ui", "brand", "extension-chrome", "config"];

/** Directories that must not be copied from the monorepo workspace packages. */
export const SKIP_DIR_NAMES = new Set(["node_modules", ".turbo", "coverage", "dist", ".next"]);

/**
 * @param {string} dir
 */
function hasWorkspacePackages(dir) {
  return requiredPackages.every((name) =>
    fs.existsSync(path.join(dir, "packages", name, "package.json")),
  );
}

/**
 * @param {string} sourceDir
 * @param {string} destDir
 */
export function copyPackageTree(sourceDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    if (entry.isDirectory() && SKIP_DIR_NAMES.has(entry.name)) {
      continue;
    }
    const from = path.join(sourceDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyPackageTree(from, to);
    } else if (entry.isSymbolicLink()) {
      // Skip dangling Bun workspace links; npm will install real deps.
      continue;
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function removeVendor() {
  if (!fs.existsSync(vendor)) {
    return;
  }
  fs.rmSync(vendor, { recursive: true, force: true });
}

function copyPackagesFrom(sourceDir) {
  removeVendor();
  fs.mkdirSync(vendorPackages, { recursive: true });
  for (const name of requiredPackages) {
    const from = path.join(sourceDir, name);
    const to = path.join(vendorPackages, name);
    copyPackageTree(from, to);
  }
}

function main() {
  let source = sibling;

  if (hasWorkspacePackages(sibling)) {
    console.log("ensure-helvety: copying packages from ../helvety into .helvety/");
    copyPackagesFrom(siblingPackages);
    source = vendor;
  } else if (hasWorkspacePackages(vendor)) {
    console.log("ensure-helvety: using existing .helvety clone");
    source = vendor;
  } else {
    console.log("ensure-helvety: cloning Helvety monorepo (shallow) into .helvety …");
    removeVendor();
    execSync(`git clone --depth 1 ${repo} "${vendor}"`, {
      stdio: "inherit",
      cwd: root,
    });
    source = vendor;
  }

  if (!hasWorkspacePackages(source)) {
    console.error("ensure-helvety: Helvety packages/ layout not found");
    process.exit(1);
  }

  execSync("node scripts/patch-helvety-workspace-deps.mjs", {
    stdio: "inherit",
    cwd: root,
  });

  console.log("ensure-helvety: done");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main();
}
