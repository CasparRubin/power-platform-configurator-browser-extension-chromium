import { describe, expect, it } from "vitest";
import { formatPowerAppsPreferencesApplyStatus } from "../src/popup/format-powerapps-preferences";
import { POWER_APPS_PERSIST_STATUS } from "../src/popup/persist-status-messages";

describe("formatPowerAppsPreferencesApplyStatus", () => {
  it("reports when enforcement is off", () => {
    const status = formatPowerAppsPreferencesApplyStatus({ ok: true, results: [] });
    expect(status.message).toContain("Enforcement is off");
    expect(status.variant).toBe("success");
  });

  it("formats all-success multi-action status without frame counts", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: true,
      results: [
        { ok: true, action: "unhide", unhidden: 1 },
        { ok: true, action: "unlock", unlocked: 2, framesChecked: 3 },
      ],
    });
    expect(status.message).toContain("Unhid 1 element");
    expect(status.message).toContain("Unlocked 2 controls");
    expect(status.message).not.toContain("frame");
    expect(status.variant).toBe("success");
  });

  it("treats no_form_context as deferred apply (info), not a hard error", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unhide", error: "no_form_context", framesChecked: 7 }],
    });
    expect(status.message).toBe(POWER_APPS_PERSIST_STATUS.savedApplyDeferred);
    expect(status.variant).toBe("info");
    expect(status.message).not.toContain("Checked");
  });

  it("combines partial success with deferred reload hint", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [
        { ok: true, action: "unhide", unhidden: 2, framesChecked: 1 },
        { ok: false, action: "unlock", error: "no_form_context", framesChecked: 1 },
      ],
    });
    expect(status.message).toContain("Unhid 2 elements");
    expect(status.message).toContain(POWER_APPS_PERSIST_STATUS.applyFinishRemaining);
    expect(status.variant).toBe("info");
  });

  it("surfaces hard errors for unsupported host", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unhide", error: "unsupported_host" }],
    });
    expect(status.variant).toBe("error");
    expect(status.message).toContain("Dataverse");
  });

  it("reports benign no_controls_updated as saved with info copy", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unhide", error: "no_controls_updated", framesChecked: 4 }],
    });
    expect(status.message).toBe(POWER_APPS_PERSIST_STATUS.savedNothingToReveal);
    expect(status.variant).toBe("info");
  });

  it("uses action-specific copy when disabled controls need no change", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unlock", error: "no_controls_updated" }],
    });
    expect(status.message).toBe(POWER_APPS_PERSIST_STATUS.savedNothingToUnlock);
    expect(status.variant).toBe("info");
  });

  it("combines no-change copy without repeating the saved prefix", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [
        { ok: false, action: "unhide", error: "no_controls_updated" },
        { ok: false, action: "unlock", error: "no_controls_updated" },
      ],
    });
    expect(status.message).toBe(POWER_APPS_PERSIST_STATUS.savedNothingToRevealOrUnlock);
    expect(status.message.match(/Preference saved/g)).toHaveLength(1);
    expect(status.variant).toBe("info");
  });

  it("keeps success variant when unlock had nothing to change", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [
        { ok: true, action: "unhide", unhidden: 1 },
        { ok: false, action: "unlock", error: "no_controls_updated" },
      ],
    });
    expect(status.variant).toBe("success");
    expect(status.message).toContain("Unhid 1 element");
    expect(status.message).not.toContain(POWER_APPS_PERSIST_STATUS.savedNothingToUnlock);
  });

  it("surfaces unknown apply errors as hard errors", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unhide", error: "unexpected_failure" }],
    });
    expect(status.variant).toBe("error");
    expect(status.message).toContain("Could not apply");
  });

  it("treats injection_failed as deferred apply", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [{ ok: false, action: "unlock", error: "injection_failed", detail: "tab gone" }],
    });
    expect(status.message).toBe(POWER_APPS_PERSIST_STATUS.savedApplyDeferred);
    expect(status.variant).toBe("info");
  });

  it("combines hard errors from multiple enforced actions", () => {
    const status = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [
        { ok: false, action: "unhide", error: "host_not_permitted", detail: "manifest" },
        { ok: false, action: "unlock", error: "scripting_unavailable" },
      ],
    });
    expect(status.variant).toBe("error");
    expect(status.message).toContain("browser's extensions page");
    expect(status.message).toContain("browser scripting API");
  });
});
