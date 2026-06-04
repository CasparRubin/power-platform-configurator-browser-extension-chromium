import { afterEach, describe, expect, it, vi } from "vitest";

import { applyPowerAppsFormActionOnTab } from "../src/powerapps/apply-form-actions";
import { powerAppsFormActionInPage } from "../src/powerapps/xrm-page-script";

function chromeScriptingStub(
  executeScript: ReturnType<typeof vi.fn>,
  runtimeLastError?: { message?: string },
): {
  scripting: { executeScript: ReturnType<typeof vi.fn> };
  runtime: { lastError?: { message?: string } };
} {
  return {
    scripting: { executeScript },
    runtime: { lastError: runtimeLastError },
  };
}

describe("applyPowerAppsFormActionOnTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns scripting_unavailable when chrome.scripting is missing", async () => {
    vi.stubGlobal("chrome", { runtime: {} } as unknown as typeof chrome);
    const result = await applyPowerAppsFormActionOnTab(1, "unhide");
    expect(result).toEqual({
      ok: false,
      action: "unhide",
      error: "scripting_unavailable",
      detail: "chrome.scripting is missing",
    });
  });

  it("returns inject_no_result when no frame returns a result", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: undefined }, { result: undefined }]);
    vi.stubGlobal("chrome", chromeScriptingStub(executeScript) as unknown as typeof chrome);

    const result = await applyPowerAppsFormActionOnTab(9, "unlock");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("inject_no_result");
    expect(result.framesChecked).toBe(2);
    expect(result.detail).toContain("2 frame(s)");
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 9, allFrames: true },
      world: "MAIN",
      func: powerAppsFormActionInPage,
      args: ["unlock"],
    });
  });

  it("returns host_not_permitted when Chrome reports manifest host access denied", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: undefined }]);
    vi.stubGlobal(
      "chrome",
      chromeScriptingStub(executeScript, {
        message:
          'Cannot access contents of url "https://oms-test.crm17.dynamics.com/main.aspx". Extension manifest must request permission to access this host.',
      }) as unknown as typeof chrome,
    );

    const result = await applyPowerAppsFormActionOnTab(3, "unhide");
    expect(result.error).toBe("host_not_permitted");
    expect(result.detail).toContain("Extension manifest must request permission");
  });

  it("includes chrome.runtime.lastError in inject_no_result detail", async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: undefined }]);
    vi.stubGlobal(
      "chrome",
      chromeScriptingStub(executeScript, {
        message: "The frame was removed",
      }) as unknown as typeof chrome,
    );

    const result = await applyPowerAppsFormActionOnTab(3, "unhide");
    expect(result.error).toBe("inject_no_result");
    expect(result.detail).toContain("The frame was removed");
  });

  it("picks the frame with the highest unhidden count", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([
        { result: { ok: true, action: "unhide", unhidden: 1 } },
        { result: { ok: true, action: "unhide", unhidden: 5 } },
        { result: { ok: false, action: "unhide", error: "no_form_context" } },
      ]);
    vi.stubGlobal("chrome", chromeScriptingStub(executeScript) as unknown as typeof chrome);

    const result = await applyPowerAppsFormActionOnTab(2, "unhide");
    expect(result).toEqual({
      ok: true,
      action: "unhide",
      unhidden: 5,
      framesChecked: 3,
    });
  });

  it("prefers no_form_context over no_controls_updated when no frame succeeds", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([
        { result: { ok: false, action: "unlock", error: "no_controls_updated" } },
        { result: { ok: false, action: "unlock", error: "no_form_context" } },
      ]);
    vi.stubGlobal("chrome", chromeScriptingStub(executeScript) as unknown as typeof chrome);

    const result = await applyPowerAppsFormActionOnTab(4, "unlock");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no_form_context");
    expect(result.framesChecked).toBe(2);
  });

  it("returns host_not_permitted when executeScript throws with manifest access error", async () => {
    const executeScript = vi.fn().mockRejectedValue(new Error("Could not inject"));
    vi.stubGlobal(
      "chrome",
      chromeScriptingStub(executeScript, {
        message: 'Cannot access contents of url "https://oms-test.crm17.dynamics.com/"',
      }) as unknown as typeof chrome,
    );

    const result = await applyPowerAppsFormActionOnTab(7, "unlock");
    expect(result.error).toBe("host_not_permitted");
    expect(result.detail).toContain("Cannot access contents of url");
  });

  it("returns injection_failed with detail when executeScript throws", async () => {
    const executeScript = vi.fn().mockRejectedValue(new Error("tab not found"));
    vi.stubGlobal(
      "chrome",
      chromeScriptingStub(executeScript, {
        message: "No tab with id: 99",
      }) as unknown as typeof chrome,
    );

    const result = await applyPowerAppsFormActionOnTab(99, "unhide");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("injection_failed");
    expect(result.detail).toContain("tab not found");
    expect(result.detail).toContain("No tab with id: 99");
  });

  it("returns inject_no_result with zero-frame detail when executeScript returns empty", async () => {
    const executeScript = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("chrome", chromeScriptingStub(executeScript) as unknown as typeof chrome);

    const result = await applyPowerAppsFormActionOnTab(1, "unhide");
    expect(result.error).toBe("inject_no_result");
    expect(result.framesChecked).toBe(0);
    expect(result.detail).toContain("No frames were injected");
  });
});
