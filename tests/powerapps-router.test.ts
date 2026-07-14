import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("powerapps background router", () => {
  it("registers runtime message handlers for schedule and active-tab apply", () => {
    const router = readFileSync(join(repoRoot, "src/background/powerapps-router.ts"), "utf8");
    expect(router).toContain("POWERAPPS_MESSAGE.SCHEDULE_APPLY");
    expect(router).toContain("POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB");
    expect(router).toContain("installPowerAppsRouter");
    expect(router).not.toContain("APPLY_FORM_ACTION");
    expect(router).toContain("schedulePowerAppsApplyForTab");
    expect(router).toContain("onPowerAppsSyncStorageChanged");
    // Chrome <148-compatible async reply (not Promise-returning onMessage / browser.*)
    expect(router).toContain("sendResponse");
    expect(router).toMatch(/return true/);
    expect(router).not.toMatch(/onMessage\.addListener\(\s*async/);
    expect(router).not.toContain("browser.");
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
    expect(background).toContain("chrome.tabs.update(tabId, { url: nextUrl }).catch");
    expect(background).not.toMatch(/tabs\.update\([^)]*,\s*\(\)\s*=>/);
    expect(background).toContain("chrome.storage.sync.get([...SYNC_POLICY_KEYS])");
    expect(background).not.toContain("browser.");
  });

  it("content-powerapps schedules apply on navigation", () => {
    const content = readFileSync(join(repoRoot, "src/content-powerapps.ts"), "utf8");
    expect(content).toContain("POWERAPPS_MESSAGE.SCHEDULE_APPLY");
    expect(content).toContain("pushState");
    expect(content).toContain("isPowerAppsSyncChange");
  });

  it("Power Automate content script spreads SYNC_POLICY_KEYS for chrome.storage.sync.get typings", () => {
    const content = readFileSync(join(repoRoot, "src/content.ts"), "utf8");
    expect(content).toContain("chrome.storage.sync.get([...SYNC_POLICY_KEYS])");
    expect(content).not.toMatch(/chrome\.storage\.sync\.get\(SYNC_POLICY_KEYS\)/);
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
