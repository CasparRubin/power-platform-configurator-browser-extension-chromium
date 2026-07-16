import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

type DriftVersions = {
  react?: string;
  "react-dom"?: string;
  "lucide-react"?: string;
};

/**
 * Resolve Helvety drift pins from vendored or sibling `workspace-version-drift.config.json`.
 */
function resolveHelvetyDriftVersions(): DriftVersions {
  const configCandidates = [
    join(repoRoot, ".helvety/scripts/workspace-version-drift.config.json"),
    join(repoRoot, "../helvety/scripts/workspace-version-drift.config.json"),
  ];
  for (const path of configCandidates) {
    if (!existsSync(path)) {
      continue;
    }
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      requiredVersionByDep?: Record<string, string>;
    };
    const map = parsed.requiredVersionByDep ?? {};
    return {
      react: map.react,
      "react-dom": map["react-dom"],
      "lucide-react": map["lucide-react"],
    };
  }

  throw new Error(
    "Helvety drift config not found; run preinstall or place ../helvety beside this repo",
  );
}

describe("power-platform extension dependency pins", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it("aligns react and lucide with Helvety monorepo drift minimums", () => {
    const drift = resolveHelvetyDriftVersions();

    expect(packageJson.dependencies?.react).toBe(drift.react);
    expect(packageJson.dependencies?.["react-dom"]).toBe(drift["react-dom"]);
    expect(packageJson.dependencies?.["lucide-react"]).toBe(drift["lucide-react"]);
  });

  it("keeps legacy toolchain on Tailwind 3 / Vite 7 until dedicated migration", () => {
    expect(packageJson.devDependencies?.tailwindcss).toMatch(/^\^3\./);
    expect(packageJson.devDependencies?.vite).toMatch(/^\^7\./);
    expect(packageJson.devDependencies?.typescript).toBe("^5.9.3");
  });

  it("pins current Chrome typings and React Hooks ESLint flat config major", () => {
    expect(packageJson.devDependencies?.["@types/chrome"]).toMatch(/^\^0\.1\./);
    expect(packageJson.devDependencies?.["eslint-plugin-react-hooks"]).toMatch(/^\^7\./);
    const eslintConfig = readFileSync(join(repoRoot, "eslint.config.mjs"), "utf8");
    expect(eslintConfig).toContain("globals.es2022");
    expect(eslintConfig).toContain("reactHooks.configs.flat.recommended");
    expect(eslintConfig).not.toContain("globals.es2021");
  });
});
