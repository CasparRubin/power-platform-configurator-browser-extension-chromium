import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readmeSection(readme: string, heading: string): string {
  const start = readme.indexOf(heading);
  if (start === -1) {
    return "";
  }
  const after = readme.slice(start + heading.length);
  const nextHeading = after.search(/\n## /);
  return nextHeading === -1 ? after : after.slice(0, nextHeading);
}

function extractReadmeTestTableLinks(readme: string): string[] {
  const table = readme.slice(readme.indexOf("## Unit tests"));
  const links = new Set<string>();
  for (const line of table.split("\n")) {
    if (!line.startsWith("| [`tests/")) {
      continue;
    }
    const match = line.match(/\[`(tests\/[^`]+\.test\.ts)`\]/);
    if (match && !match[1].includes("*")) {
      links.add(match[1]);
    }
  }
  return [...links].sort();
}

describe("README and docs accuracy (current product scope)", () => {
  const readme = readRepoFile("README.md");
  const pkg = JSON.parse(readRepoFile("package.json")) as { scripts?: Record<string, string> };

  it("documents the full npm run build pipeline", () => {
    const scriptsSection = readmeSection(readme, "### Scripts");
    expect(scriptsSection).toMatch(/`npm run build`/);
    expect(scriptsSection).toMatch(/content-powerapps/i);
    expect(scriptsSection).toMatch(/800\s*[×x]\s*600|800×600/i);
    expect(scriptsSection).not.toMatch(/build:inspector/i);
    expect(scriptsSection).not.toMatch(/content-main-hook/i);

    const build = pkg.scripts?.build ?? "";
    expect(build).toContain("build:content-powerapps");
    expect(build).not.toContain("build:inspector");
  });

  it("What it does describes 800×600 popup and four core settings only", () => {
    const section = readmeSection(readme, "## What it does");
    expect(section).toMatch(/800\s*[×x]\s*600|800×600/i);
    expect(section).toContain("SettingsChoiceRow");
    expect(section).toContain("TAB_PANEL_HOST_CLASS");
    expect(section).toContain("Power Automate");
    expect(section).toContain("Power Apps");
    expect(section).toContain("v3survey");
    expect(section).toMatch(
      /Hide hidden fields|Show hidden fields|\*\*Hide\*\*.*hidden fields|\*\*Show\*\*.*hidden fields/i,
    );
    expect(section).toMatch(
      /Lock read-only|Unlock read-only|\*\*Lock\*\*.*read-only|\*\*Unlock\*\*.*read-only/i,
    );
    expect(section).not.toMatch(/one-shot/i);
    expect(section).not.toMatch(/action buttons on an open model-driven/i);
    expect(section).not.toContain("Flow Inspector");
    expect(section).not.toContain("side panel");
    expect(section).not.toContain("inspector.html");
  });

  it("validation checklist matches popup tabs and has no Flow Inspector steps", () => {
    const section = readmeSection(readme, "## Validation checklist");
    expect(section).toContain("Power Automate");
    expect(section).toContain("Power Apps");
    expect(section).toContain("About");
    expect(section).not.toMatch(/Flow Inspector/i);
    expect(section).not.toMatch(/side panel/i);
  });

  it("unit tests intro and table cover every tests/*.test.ts file", () => {
    const onDisk = readdirSync(join(repoRoot, "tests"))
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => `tests/${name}`)
      .sort();
    const linked = extractReadmeTestTableLinks(readme).sort();
    expect(linked).toEqual(onDisk);
  });

  it("repository layout documents popup-layout.ts and omits removed inspector paths", () => {
    const layout = readmeSection(readme, "## Repository layout");
    expect(layout).toContain("popup-layout.ts");
    expect(layout).toContain("SettingsChoiceRow");
    expect(layout).not.toContain("src/inspector");
    expect(layout).not.toContain("FlowInspectorLauncherCard");
    expect(layout).not.toContain("content-main-hook");
    expect(layout).not.toContain("vite.inspector.config");
  });

  it("popup settings components exist on disk", () => {
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsChoiceRow.tsx"))).toBe(true);
    expect(existsSync(join(repoRoot, "src/popup/components/SettingsSectionHeader.tsx"))).toBe(true);
  });
});

describe("chrome-web-store.md accuracy", () => {
  const doc = readRepoFile("docs/chrome-web-store.md");

  it("smoke test steps match three popup tabs and radio-style Power Apps settings", () => {
    expect(doc).toContain("Power Automate tab");
    expect(doc).toContain("Power Apps tab");
    expect(doc).toContain("About");
    expect(doc).not.toMatch(/Flow Inspector/i);
    expect(doc).toMatch(/Show hidden fields/i);
    expect(doc).toMatch(/Unlock read-only/i);
    expect(doc).not.toMatch(/\*\*Unhide hidden fields\*\* and \*\*Unlock read-only fields\*\*/);
  });

  it("permission table matches public manifest (no sidePanel or API hosts)", () => {
    const manifest = JSON.parse(readRepoFile("public/manifest.json")) as {
      permissions?: string[];
      host_permissions?: string[];
    };
    expect(doc).toContain("`declarativeNetRequest`");
    expect(doc).toContain("`scripting`");
    expect(doc).not.toContain("`sidePanel`");
    expect(manifest.permissions).not.toContain("sidePanel");
    expect(doc).toMatch(/Power Automate hosts/i);
    expect(doc).toMatch(/crm\.dynamics\.com/i);
    expect(doc).toMatch(/apps\.powerapps\.com/i);
    const apiHosts = ["api.powerplatform.com", "api.bap.microsoft.com", "api.flow.microsoft.com"];
    for (const api of apiHosts) {
      expect(doc).not.toContain(api);
    }
  });
});
