import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveHelvetyDriftScript(): string {
  const candidates = [
    join(repoRoot, ".helvety/scripts/check-workspace-version-drift.mjs"),
    join(repoRoot, "../helvety/scripts/check-workspace-version-drift.mjs"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, "utf8");
    }
  }
  throw new Error("Helvety drift script not found; run preinstall or link ../helvety");
}

describe("power-platform extension dependency pins", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it("aligns react and lucide with Helvety monorepo drift minimums", () => {
    const drift = resolveHelvetyDriftScript();
    const extract = (dep: string) => {
      const match = drift.match(
        new RegExp(`\\["${dep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\s*"([^"]+)"\\]`),
      );
      return match?.[1];
    };

    expect(packageJson.dependencies?.react).toBe(extract("react"));
    expect(packageJson.dependencies?.["react-dom"]).toBe(extract("react-dom"));
    expect(packageJson.dependencies?.["lucide-react"]).toBe(extract("lucide-react"));
  });

  it("keeps legacy toolchain on Tailwind 3 / Vite 7 until dedicated migration", () => {
    expect(packageJson.devDependencies?.tailwindcss).toMatch(/^\^3\./);
    expect(packageJson.devDependencies?.vite).toMatch(/^\^7\./);
    expect(packageJson.devDependencies?.typescript).toMatch(/^\^5\./);
  });
});
