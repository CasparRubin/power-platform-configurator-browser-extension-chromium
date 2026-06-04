import { describe, expect, it } from "vitest";

import { inferSettingsStatusVariant } from "../src/popup/infer-settings-status-variant";
import {
  POWER_APPS_PERSIST_STATUS,
  POWER_AUTOMATE_PERSIST_STATUS,
} from "../src/popup/persist-status-messages";
import { formatPowerAppsActionError } from "../src/popup/powerapps-client";

describe("inferSettingsStatusVariant", () => {
  it("returns loading when busy", () => {
    expect(inferSettingsStatusVariant("Saved.", { busy: true })).toBe("loading");
  });

  it("returns info for empty message when not busy", () => {
    expect(inferSettingsStatusVariant("")).toBe("info");
    expect(inferSettingsStatusVariant("   ")).toBe("info");
  });

  it("detects saving and applying messages", () => {
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saving)).toBe("loading");
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applying)).toBe("loading");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.refreshing)).toBe("loading");
  });

  it("detects success messages", () => {
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saved)).toBe("success");
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.saved)).toBe("success");
    expect(inferSettingsStatusVariant("Unhid 3 elements.")).toBe("success");
    expect(inferSettingsStatusVariant("Unlocked 1 control.")).toBe("success");
  });

  it("prefers error over success when a message contains both cues", () => {
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applyFailed)).toBe("error");
  });

  it("detects error messages from persist and powerapps-client", () => {
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.saveFailed)).toBe("error");
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applyFailed)).toBe("error");
    expect(inferSettingsStatusVariant(formatPowerAppsActionError("no_active_tab"))).toBe("error");
    expect(inferSettingsStatusVariant(formatPowerAppsActionError("host_not_permitted"))).toBe(
      "error",
    );
    expect(inferSettingsStatusVariant("Check Chrome sync sign-in, then try again.")).toBe("error");
  });

  it("classifies neutral apply guidance as info", () => {
    expect(
      inferSettingsStatusVariant(
        "Open a model-driven app on a Dataverse org URL (e.g. org.crm17.dynamics.com) first.",
      ),
    ).toBe("info");
    expect(inferSettingsStatusVariant(formatPowerAppsActionError("no_controls_updated"))).toBe(
      "info",
    );
  });

  it("does not treat Saved as loading when message is only whitespace and not busy", () => {
    expect(inferSettingsStatusVariant("Saved.", { busy: false })).toBe("success");
  });
});
