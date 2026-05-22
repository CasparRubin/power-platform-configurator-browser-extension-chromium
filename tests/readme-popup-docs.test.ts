import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README popup and icon documentation", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf8");

  it("documents ppconfigurator icons and popup chrome in What it does", () => {
    const section = readme.slice(readme.indexOf("## What it does"));
    expect(section).toContain("ppconfigurator");
    expect(section).toContain("PopupHeader");
    expect(section).toContain("ExtensionMark");
    expect(section).toMatch(/About.*Developer/i);
  });

  it("layout and unit-test tables document popup components and icon paths", () => {
    const fromUnitTests = readme.slice(readme.indexOf("## Unit tests"));
    expect(fromUnitTests).toContain("tests/popup-chrome.test.ts");
    expect(fromUnitTests).toContain("tests/readme-popup-docs.test.ts");

    const layout = readme.slice(readme.indexOf("## Repository layout"));
    expect(layout).toContain("ppconfigurator_{16,32,48,128}.png");
    expect(layout).toContain("ExtensionMark");
    expect(layout).toContain("HelvetyMark");
    expect(readme).not.toMatch(/icon_\d+\.png/);
    expect(readme).not.toContain("v3False");
  });
});
