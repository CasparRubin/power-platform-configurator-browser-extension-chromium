import { describe, expect, it } from "vitest";

import { inferSettingsStatusVariant } from "../src/popup/infer-settings-status-variant";
import {
  POWER_APPS_PERSIST_STATUS,
  POWER_AUTOMATE_PERSIST_STATUS,
} from "../src/popup/persist-status-messages";

describe("inferSettingsStatusVariant", () => {
  it("returns loading when busy", () => {
    expect(inferSettingsStatusVariant("Saved.", { busy: true })).toBe("loading");
  });

  it("returns info for empty message when not busy", () => {
    expect(inferSettingsStatusVariant("")).toBe("info");
    expect(inferSettingsStatusVariant("   ")).toBe("info");
  });

  it("detects saving and refreshing messages for Power Automate", () => {
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saving)).toBe("loading");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.refreshing)).toBe("loading");
  });

  it("detects Power Automate success messages", () => {
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saved)).toBe("success");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.savedReloaded)).toBe("success");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage)).toBe(
      "success",
    );
  });

  it("prefers error over success when a message contains both cues", () => {
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applyFailed)).toBe("error");
  });

  it("detects error messages from persist helpers", () => {
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.saveFailed)).toBe("error");
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applyFailed)).toBe("error");
    expect(inferSettingsStatusVariant("Check Chrome sync sign-in, then try again.")).toBe("error");
  });

  it.each([
    "Could not save",
    "sync failed",
    "tab not found",
    "host not permitted",
    "unsupported host",
    "No active tab",
    "No response from background",
    "Xrm is not available",
  ] as const)("classifies error substring in %s", (message) => {
    expect(inferSettingsStatusVariant(message)).toBe("error");
  });

  it("classifies reload-only guidance without error fragments as info", () => {
    expect(inferSettingsStatusVariant("Reload when ready.")).toBe("info");
    expect(inferSettingsStatusVariant("please reload the tab")).toBe("info");
  });

  it("does not treat Saved as loading when message is only whitespace and not busy", () => {
    expect(inferSettingsStatusVariant("Saved.", { busy: false })).toBe("success");
  });

  it("does not infer Power Apps applying copy as loading (explicit variant from App)", () => {
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.applying)).toBe("info");
    expect(inferSettingsStatusVariant(POWER_APPS_PERSIST_STATUS.saved)).toBe("info");
  });
});
