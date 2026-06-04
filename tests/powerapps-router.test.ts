import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("powerapps background router", () => {
  it("registers runtime message handlers for form actions and enforcement", () => {
    const router = readFileSync(join(repoRoot, "src/background/powerapps-router.ts"), "utf8");
    expect(router).toContain("POWERAPPS_MESSAGE.APPLY_FORM_ACTION");
    expect(router).toContain("POWERAPPS_MESSAGE.SCHEDULE_APPLY");
    expect(router).toContain("POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB");
    expect(router).toContain("installPowerAppsRouter");
    expect(router).toContain("applyPowerAppsFormActionOnTab");
    expect(router).toContain("schedulePowerAppsApplyForTab");
    expect(router).toContain("onPowerAppsSyncStorageChanged");
    expect(router).toContain("isPowerAppsHostUrl");
  });

  it("background service worker installs router and enforcement listeners", () => {
    const background = readFileSync(join(repoRoot, "src/background.ts"), "utf8");
    expect(background).toContain('from "./background/powerapps-router"');
    expect(background).toContain("installPowerAppsRouter()");
    expect(background).toContain("installPowerAppsEnforcementListeners()");
    expect(background).toContain("isPowerAppsSyncChange");
    expect(background).toContain("onPowerAppsSyncStorageChanged");
    expect(background).not.toContain("installInspectorRouter");
    expect(background).not.toContain("inspector-router");
    expect(background).not.toContain("sidePanel");
  });

  it("content-powerapps schedules apply on navigation", () => {
    const content = readFileSync(join(repoRoot, "src/content-powerapps.ts"), "utf8");
    expect(content).toContain("POWERAPPS_MESSAGE.SCHEDULE_APPLY");
    expect(content).toContain("pushState");
    expect(content).toContain("isPowerAppsSyncChange");
  });

  it("apply-preferences exports enforcement scheduler and listeners", () => {
    const apply = readFileSync(join(repoRoot, "src/powerapps/apply-preferences.ts"), "utf8");
    expect(apply).toContain("schedulePowerAppsApplyForTab");
    expect(apply).toContain("applyPowerAppsPreferencesToAllHostTabs");
    expect(apply).toContain("installPowerAppsEnforcementListeners");
    expect(apply).toContain("getRetryDelayMs");
    expect(apply).toContain("clearPowerAppsTabScheduleState");
  });
});

describe("applyPowerAppsFormActionOnTab (source contract)", () => {
  it("reports inject_no_result, framesChecked, and detail for diagnostics", () => {
    const apply = readFileSync(join(repoRoot, "src/powerapps/apply-form-actions.ts"), "utf8");
    expect(apply).toContain("inject_no_result");
    expect(apply).toContain("host_not_permitted");
    expect(apply).toContain("framesChecked");
    expect(apply).toContain("detail");
    expect(apply).toContain("powerAppsFormActionInPage");
    expect(apply).toContain('world: "MAIN"');
    expect(apply).toContain("allFrames: true");
  });
});
