import { describe, expect, it } from "vitest";
import { formatPowerAppsPreferencesApplyStatus } from "../src/popup/format-powerapps-preferences";

describe("formatPowerAppsPreferencesApplyStatus", () => {
  it("reports when enforcement is off", () => {
    expect(formatPowerAppsPreferencesApplyStatus({ ok: true, results: [] })).toContain(
      "Enforcement is off",
    );
  });

  it("formats all-success multi-action status", () => {
    const text = formatPowerAppsPreferencesApplyStatus({
      ok: true,
      results: [
        { ok: true, action: "unhide", unhidden: 1 },
        { ok: true, action: "unlock", unlocked: 2, framesChecked: 3 },
      ],
    });
    expect(text).toContain("Unhid 1 element");
    expect(text).toContain("Unlocked 2 controls");
    expect(text).toContain("3 frames");
  });

  it("combines success and error lines", () => {
    const text = formatPowerAppsPreferencesApplyStatus({
      ok: false,
      results: [
        { ok: true, action: "unhide", unhidden: 2, framesChecked: 1 },
        { ok: false, action: "unlock", error: "no_form_context", framesChecked: 1 },
      ],
    });
    expect(text).toContain("Unhid 2 elements");
    expect(text).toContain("record form");
  });
});
