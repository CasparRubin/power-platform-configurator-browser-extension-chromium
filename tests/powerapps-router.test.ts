import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("powerapps background router", () => {
  it("registers runtime message handler for apply-form-action", () => {
    const router = readFileSync(join(repoRoot, "src/background/powerapps-router.ts"), "utf8");
    expect(router).toContain("POWERAPPS_MESSAGE.APPLY_FORM_ACTION");
    expect(router).toContain("installPowerAppsRouter");
    expect(router).toContain("applyPowerAppsFormActionOnTab");
  });

  it("background service worker installs the router at startup", () => {
    const background = readFileSync(join(repoRoot, "src/background.ts"), "utf8");
    expect(background).toContain('from "./background/powerapps-router"');
    expect(background).toContain("installPowerAppsRouter()");
    expect(background).not.toContain("installInspectorRouter");
    expect(background).not.toContain("inspector-router");
    expect(background).not.toContain("sidePanel");
  });
});
