// Rewrites workspace:* in .helvety/packages only (never the sibling monorepo).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorPackages = path.join(root, ".helvety", "packages");

function patchDeps(deps) {
  if (!deps) {
    return;
  }
  for (const key of Object.keys(deps)) {
    if (deps[key] === "workspace:*" && key.startsWith("@helvety/")) {
      const pkg = key.slice("@helvety/".length);
      deps[key] = `file:../${pkg}`;
    }
  }
}

if (!fs.existsSync(vendorPackages)) {
  process.exit(0);
}

for (const name of fs.readdirSync(vendorPackages)) {
  const pkgJsonPath = path.join(vendorPackages, name, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    continue;
  }
  const parsed = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  if (!JSON.stringify(parsed).includes("workspace:*")) {
    continue;
  }
  patchDeps(parsed.dependencies);
  patchDeps(parsed.devDependencies);
  patchDeps(parsed.optionalDependencies);
  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`patch-helvety-workspace-deps: patched packages/${name}/package.json`);
}
