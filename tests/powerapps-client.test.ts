import { describe, expect, it, vi } from "vitest";

import {
  formatPowerAppsActionErrorForNotification,
  formatPowerAppsActionSuccessForNotification,
  requestPowerAppsApplyPreferencesOnActiveTab,
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

describe("formatPowerAppsActionErrorForNotification", () => {
  it("maps inject_no_result with detail", () => {
    const message = formatPowerAppsActionErrorForNotification(
      "inject_no_result",
      "Script did not return in 3 frame(s)",
    );
    expect(message).toContain("record form");
    expect(message).toContain("Script did not return");
    expect(message).not.toContain("Checked");
  });

  it("maps no_form_context for notifications without frame diagnostics", () => {
    const message = formatPowerAppsActionErrorForNotification("no_form_context");
    expect(message).toContain("still loading");
    expect(message).toContain("Reload the page");
    expect(message).not.toContain("Checked");
  });

  it("maps injection_failed with detail", () => {
    const message = formatPowerAppsActionErrorForNotification(
      "injection_failed",
      "tab not found (No tab with id: 99)",
    );
    expect(message).toContain("inject");
    expect(message).toContain("Reload the page");
    expect(message).not.toContain("Reload the form tab");
    expect(message).toContain("tab not found");
  });

  it("maps no_controls_updated without implying injection failure", () => {
    const message = formatPowerAppsActionErrorForNotification("no_controls_updated");
    expect(message).toContain("No hidden or locked fields");
    expect(message).not.toContain("inject");
  });

  it("maps host_not_permitted with reload extension hint", () => {
    const message = formatPowerAppsActionErrorForNotification(
      "host_not_permitted",
      "Extension manifest must request permission",
    );
    expect(message).toContain("chrome://extensions");
  });

  it("maps unsupported_host for Dataverse hosts", () => {
    expect(formatPowerAppsActionErrorForNotification("unsupported_host")).toContain("crm17");
    expect(formatPowerAppsActionErrorForNotification("unsupported_host")).toContain("dynamics.cn");
    expect(formatPowerAppsActionErrorForNotification("unsupported_host")).toContain(
      "apps.powerapps.com",
    );
  });

  it("maps scripting_unavailable with detail", () => {
    expect(
      formatPowerAppsActionErrorForNotification(
        "scripting_unavailable",
        "chrome.scripting is missing",
      ),
    ).toContain("scripting API");
  });

  it("maps no_active_tab, no_response, and message_failed", () => {
    expect(formatPowerAppsActionErrorForNotification("no_active_tab")).toContain(
      "No active browser tab",
    );
    expect(formatPowerAppsActionErrorForNotification("no_response", "empty")).toContain(
      "No response",
    );
    expect(formatPowerAppsActionErrorForNotification("no_response", "empty")).toContain("empty");
    expect(formatPowerAppsActionErrorForNotification("message_failed", "disconnected")).toContain(
      "background",
    );
    expect(formatPowerAppsActionErrorForNotification("message_failed", "disconnected")).toContain(
      "disconnected",
    );
  });

  it("maps unknown errors with optional detail", () => {
    expect(formatPowerAppsActionErrorForNotification("custom_code", "extra")).toContain(
      "record form",
    );
    expect(formatPowerAppsActionErrorForNotification("custom_code", "extra")).toContain("extra");
    expect(formatPowerAppsActionErrorForNotification(undefined)).toContain("record form");
  });

  it("maps injection_failed for notifications", () => {
    expect(formatPowerAppsActionErrorForNotification("injection_failed")).toContain(
      "Could not inject",
    );
  });
});

describe("formatPowerAppsActionSuccessForNotification", () => {
  it("omits frame counts from notification success copy", () => {
    expect(
      formatPowerAppsActionSuccessForNotification("unhide", {
        ok: true,
        action: "unhide",
        unhidden: 2,
        framesChecked: 4,
      }),
    ).toBe("Unhid 2 elements.");
    expect(
      formatPowerAppsActionSuccessForNotification("unlock", {
        ok: true,
        action: "unlock",
        unlocked: 1,
        framesChecked: 2,
      }),
    ).toBe("Unlocked 1 control.");
  });

  it("uses singular and plural success copy", () => {
    expect(
      formatPowerAppsActionSuccessForNotification("unhide", {
        ok: true,
        action: "unhide",
        unhidden: 1,
      }),
    ).toBe("Unhid 1 element.");
    expect(
      formatPowerAppsActionSuccessForNotification("unlock", {
        ok: true,
        action: "unlock",
        unlocked: 1,
      }),
    ).toBe("Unlocked 1 control.");
    expect(
      formatPowerAppsActionSuccessForNotification("unhide", {
        ok: true,
        action: "unhide",
        unhidden: 3,
      }),
    ).toBe("Unhid 3 elements.");
    expect(
      formatPowerAppsActionSuccessForNotification("unlock", {
        ok: true,
        action: "unlock",
        unlocked: 2,
      }),
    ).toBe("Unlocked 2 controls.");
  });
});
