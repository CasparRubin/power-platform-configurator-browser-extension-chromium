import { describe, expect, it, vi } from "vitest";

import {
  formatPowerAppsActionError,
  formatPowerAppsActionSuccess,
  requestPowerAppsApplyPreferencesOnActiveTab,
  requestPowerAppsFormAction,
} from "../src/popup/powerapps-client";
import { POWERAPPS_MESSAGE } from "../src/powerapps/constants";

describe("requestPowerAppsApplyPreferencesOnActiveTab", () => {
  it("returns background response when results array is present", async () => {
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      results: [{ ok: true, action: "unhide", unhidden: 1 }],
    });
    vi.stubGlobal("chrome", { runtime: { sendMessage } } as unknown as typeof chrome);

    await expect(requestPowerAppsApplyPreferencesOnActiveTab()).resolves.toEqual({
      ok: true,
      results: [{ ok: true, action: "unhide", unhidden: 1 }],
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB,
    });

    vi.unstubAllGlobals();
  });

  it("maps missing response to no_response", async () => {
    vi.stubGlobal("chrome", {
      runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
    } as unknown as typeof chrome);

    const response = await requestPowerAppsApplyPreferencesOnActiveTab();
    expect(response.ok).toBe(false);
    expect(response.results[0]?.error).toBe("no_response");

    vi.unstubAllGlobals();
  });

  it("maps sendMessage rejection to message_failed", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockRejectedValue(new Error("disconnected")),
      },
    } as unknown as typeof chrome);

    const response = await requestPowerAppsApplyPreferencesOnActiveTab();
    expect(response.ok).toBe(false);
    expect(response.results[0]?.error).toBe("message_failed");
    expect(response.results[0]?.detail).toContain("disconnected");

    vi.unstubAllGlobals();
  });
});

describe("requestPowerAppsFormAction", () => {
  it("sends APPLY_FORM_ACTION with action", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, action: "unlock", unlocked: 0 });
    vi.stubGlobal("chrome", { runtime: { sendMessage } } as unknown as typeof chrome);

    await requestPowerAppsFormAction("unlock");
    expect(sendMessage).toHaveBeenCalledWith({
      type: POWERAPPS_MESSAGE.APPLY_FORM_ACTION,
      action: "unlock",
    });

    vi.unstubAllGlobals();
  });

  it("maps missing response to no_response", async () => {
    vi.stubGlobal("chrome", {
      runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) },
    } as unknown as typeof chrome);

    const response = await requestPowerAppsFormAction("unhide");
    expect(response.error).toBe("no_response");

    vi.unstubAllGlobals();
  });

  it("maps sendMessage rejection to message_failed", async () => {
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockRejectedValue(new Error("port closed")),
      },
    } as unknown as typeof chrome);

    const response = await requestPowerAppsFormAction("unhide");
    expect(response.error).toBe("message_failed");
    expect(response.detail).toContain("port closed");

    vi.unstubAllGlobals();
  });
});

describe("formatPowerAppsActionError", () => {
  it("includes detail and frame count for inject_no_result", () => {
    const message = formatPowerAppsActionError(
      "inject_no_result",
      "Script did not return in 3 frame(s)",
      3,
    );
    expect(message).toContain("record form");
    expect(message).toContain("Script did not return");
    expect(message).toContain("Checked 3 frames");
  });

  it("maps no_form_context with frame hint", () => {
    const message = formatPowerAppsActionError("no_form_context", undefined, 5);
    expect(message).toContain("record form");
    expect(message).toContain("Checked 5 frames");
  });

  it("maps injection_failed with detail and frames", () => {
    const message = formatPowerAppsActionError(
      "injection_failed",
      "tab not found (No tab with id: 99)",
      1,
    );
    expect(message).toContain("inject");
    expect(message).toContain("tab not found");
    expect(message).toContain("Checked 1 frame");
  });

  it("maps no_controls_updated without implying injection failure", () => {
    const message = formatPowerAppsActionError("no_controls_updated", undefined, 6);
    expect(message).toContain("No hidden or locked fields");
    expect(message).not.toContain("inject");
    expect(message).toContain("Checked 6 frames");
  });

  it("maps host_not_permitted with reload extension hint", () => {
    const message = formatPowerAppsActionError(
      "host_not_permitted",
      "Extension manifest must request permission",
      2,
    );
    expect(message).toContain("chrome://extensions");
    expect(message).toContain("Checked 2 frames");
  });

  it("maps unsupported_host for Dataverse hosts", () => {
    expect(formatPowerAppsActionError("unsupported_host")).toContain("crm17");
    expect(formatPowerAppsActionError("unsupported_host")).toContain("dynamics.cn");
    expect(formatPowerAppsActionError("unsupported_host")).toContain("apps.powerapps.com");
  });

  it("maps scripting_unavailable with detail", () => {
    expect(
      formatPowerAppsActionError("scripting_unavailable", "chrome.scripting is missing"),
    ).toContain("scripting API");
  });

  it("maps no_active_tab, no_response, and message_failed", () => {
    expect(formatPowerAppsActionError("no_active_tab")).toContain("No active browser tab");
    expect(formatPowerAppsActionError("no_response", "empty")).toContain("No response");
    expect(formatPowerAppsActionError("no_response", "empty")).toContain("empty");
    expect(formatPowerAppsActionError("message_failed", "disconnected")).toContain("background");
    expect(formatPowerAppsActionError("message_failed", "disconnected")).toContain("disconnected");
  });

  it("maps unknown errors with optional detail", () => {
    expect(formatPowerAppsActionError("custom_code", "extra")).toContain("record form");
    expect(formatPowerAppsActionError("custom_code", "extra")).toContain("extra");
    expect(formatPowerAppsActionError(undefined)).toContain("record form");
  });
});

describe("formatPowerAppsActionSuccess", () => {
  it("appends frame count when present", () => {
    expect(
      formatPowerAppsActionSuccess("unhide", {
        ok: true,
        action: "unhide",
        unhidden: 2,
        framesChecked: 4,
      }),
    ).toBe("Unhid 2 elements. (4 frames)");
  });

  it("singular unlock message", () => {
    expect(
      formatPowerAppsActionSuccess("unlock", {
        ok: true,
        action: "unlock",
        unlocked: 1,
      }),
    ).toBe("Unlocked 1 control.");
  });

  it("uses plural success copy for multiple elements", () => {
    expect(
      formatPowerAppsActionSuccess("unhide", {
        ok: true,
        action: "unhide",
        unhidden: 3,
      }),
    ).toBe("Unhid 3 elements.");
    expect(
      formatPowerAppsActionSuccess("unlock", {
        ok: true,
        action: "unlock",
        unlocked: 2,
      }),
    ).toBe("Unlocked 2 controls.");
  });
});
