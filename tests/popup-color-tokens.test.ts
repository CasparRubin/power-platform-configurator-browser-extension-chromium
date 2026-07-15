import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/**
 * Guardrail mirroring the monorepo's `packages/ui/src/ui-actions-wiring.test.ts`.
 *
 * The shared `@helvety/extension-chrome/extension-tokens.css` design tokens are full OKLCH colors.
 * Wrapping them in an `hsl()` color function (the pre-v3.7 pattern) emits invalid `hsl(oklch(...))`,
 * which browsers drop -> missing backgrounds and white/`currentColor` borders. Tokens must be
 * referenced directly, with a `color-mix` alpha slot so Tailwind opacity modifiers keep working.
 */
describe("popup color tokens (OKLCH-safe Tailwind mapping)", () => {
  it("maps design tokens without re-wrapping OKLCH values in hsl()", () => {
    const config = readSource("tailwind.config.js");
    expect(config).not.toContain("hsl(var(");
    expect(config).toContain("color-mix(");
    expect(config).toContain('alpha("--border")');
  });

  it("supports opacity modifiers via a Tailwind <alpha-value> slot", () => {
    expect(readSource("tailwind.config.js")).toContain("<alpha-value>");
  });

  it("imports the shared OKLCH extension design tokens into the popup CSS entry", () => {
    const css = readSource("src/popup/index.css");
    expect(css).toContain("@helvety/extension-chrome/extension-tokens.css");
  });
});
