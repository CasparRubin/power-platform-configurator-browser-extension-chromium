import { describe, expect, it } from "vitest";

import { inferSettingsStatusVariant } from "../src/popup/infer-settings-status-variant";
import {
  POWER_APPS_PERSIST_STATUS,
  POWER_AUTOMATE_PERSIST_STATUS,
} from "../src/popup/persist-status-messages";

describe("POWER_AUTOMATE_PERSIST_STATUS", () => {
  it("exports stable keys used by persist-policy-preference", () => {
    expect(Object.keys(POWER_AUTOMATE_PERSIST_STATUS).sort()).toEqual([
      "refreshing",
      "saved",
      "savedReloadPage",
      "savedReloaded",
      "saving",
    ]);
  });

  it.each([
    [POWER_AUTOMATE_PERSIST_STATUS.saving, "loading"],
    [POWER_AUTOMATE_PERSIST_STATUS.refreshing, "loading"],
    [POWER_AUTOMATE_PERSIST_STATUS.saved, "success"],
    [POWER_AUTOMATE_PERSIST_STATUS.savedReloaded, "success"],
    [POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage, "success"],
  ] as const)("variant for %s", (message, variant) => {
    expect(inferSettingsStatusVariant(message)).toBe(variant);
  });

  it("reload outcomes tell the user what happened", () => {
    expect(POWER_AUTOMATE_PERSIST_STATUS.savedReloaded).toMatch(/Reloaded/i);
    expect(POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage).toMatch(/Reload the flow or run page/i);
  });
});

describe("POWER_APPS_PERSIST_STATUS", () => {
  it("exports stable keys used by persist-powerapps-preference", () => {
    expect(Object.keys(POWER_APPS_PERSIST_STATUS).sort()).toEqual([
      "applyFailed",
      "applyFinishRemaining",
      "applying",
      "saveFailed",
      "saved",
      "savedApplyDeferred",
      "savedNothingToReveal",
      "savedNothingToRevealOrUnlock",
      "savedNothingToUnlock",
      "saving",
    ]);
  });

  it("inactive and apply-failed paths give distinct reload guidance", () => {
    expect(POWER_APPS_PERSIST_STATUS.saved).toMatch(/Reload open record forms/i);
    expect(POWER_APPS_PERSIST_STATUS.saved).toMatch(/restore platform defaults/i);
    expect(POWER_APPS_PERSIST_STATUS.applyFailed).toMatch(/Reload the page/i);
  });

  it("uses accurate deferred and action-specific no-change copy", () => {
    expect(POWER_APPS_PERSIST_STATUS.savedApplyDeferred).toMatch(
      /could not be applied to the active tab/i,
    );
    expect(POWER_APPS_PERSIST_STATUS.savedNothingToReveal).toMatch(
      /hidden tabs, sections, or controls/i,
    );
    expect(POWER_APPS_PERSIST_STATUS.savedNothingToUnlock).toMatch(/disabled controls/i);
  });
});
