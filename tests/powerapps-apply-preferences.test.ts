import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPowerAppsPreferencesOnActiveTab,
  applyPowerAppsPreferencesOnTab,
  applyPowerAppsPreferencesOnTabWithRetries,
  POPUP_ACTIVE_TAB_RETRY_DELAYS_MS,
  applyPowerAppsPreferencesToAllHostTabs,
  clearPowerAppsTabScheduleState,
  getRetryDelayMs,
  installPowerAppsEnforcementListeners,
  isPowerAppsEnforcementActive,
  readPowerAppsPreferencesFromStorage,
  schedulePowerAppsApplyForTab,
  shouldEnforceUnhide,
  shouldEnforceUnlock,
  shouldRetryApplyError,
} from "../src/powerapps/apply-preferences";

const TAB_ID = 42;

function chromePrefsStub(
  prefs: { powerAppsHiddenFields?: string; powerAppsReadOnly?: string },
  executeScript: ReturnType<typeof vi.fn>,
  tabsQuery?: ReturnType<typeof vi.fn>,
) {
  return {
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue(prefs),
      },
    },
    runtime: { lastError: undefined },
    scripting: { executeScript },
    tabs: { query: tabsQuery ?? vi.fn().mockResolvedValue([]) },
  } as unknown as typeof chrome;
}

describe("Power Apps preference helpers", () => {
  it("gates enforcement by mode", () => {
    expect(shouldEnforceUnhide({ hidden: "hide", readOnly: "lock" })).toBe(false);
    expect(shouldEnforceUnhide({ hidden: "show", readOnly: "lock" })).toBe(true);
    expect(shouldEnforceUnlock({ hidden: "hide", readOnly: "unlock" })).toBe(true);
    expect(isPowerAppsEnforcementActive({ hidden: "hide", readOnly: "lock" })).toBe(false);
    expect(isPowerAppsEnforcementActive({ hidden: "show", readOnly: "unlock" })).toBe(true);
  });

  it("shouldRetryApplyError matches late Xrm / inject failures", () => {
    expect(shouldRetryApplyError("no_form_context")).toBe(true);
    expect(shouldRetryApplyError("inject_no_result")).toBe(true);
    expect(shouldRetryApplyError("injection_failed")).toBe(true);
    expect(shouldRetryApplyError("no_controls_updated")).toBe(false);
    expect(shouldRetryApplyError(undefined)).toBe(false);
  });

  it("getRetryDelayMs returns capped backoff schedule", () => {
    expect(getRetryDelayMs(0)).toBe(300);
    expect(getRetryDelayMs(1)).toBe(1000);
    expect(getRetryDelayMs(4)).toBe(2000);
    expect(getRetryDelayMs(5)).toBeNull();
    expect(getRetryDelayMs(-1)).toBeNull();
  });
});

describe("readPowerAppsPreferencesFromStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses sync values through parsePowerAppsPreferencesFromSync", async () => {
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "unlock" }, vi.fn()),
    );
    await expect(readPowerAppsPreferencesFromStorage()).resolves.toEqual({
      hidden: "show",
      readOnly: "unlock",
    });
  });
});

describe("applyPowerAppsPreferencesOnTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs unhide then unlock when both modes are active", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([{ result: { ok: true, action: "unhide", unhidden: 2 } }])
      .mockResolvedValueOnce([{ result: { ok: true, action: "unlock", unlocked: 1 } }]);

    vi.stubGlobal("chrome", chromePrefsStub({}, executeScript));

    const results = await applyPowerAppsPreferencesOnTab(1, {
      hidden: "show",
      readOnly: "unlock",
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.action).toBe("unhide");
    expect(results[1]?.action).toBe("unlock");
    expect(executeScript).toHaveBeenCalledTimes(2);
  });

  it("returns empty when enforcement is off", async () => {
    vi.stubGlobal("chrome", chromePrefsStub({}, vi.fn()));

    const results = await applyPowerAppsPreferencesOnTab(1, {
      hidden: "hide",
      readOnly: "lock",
    });
    expect(results).toEqual([]);
  });
});

describe("applyPowerAppsPreferencesOnTabWithRetries", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries until form context is available", async () => {
    vi.useFakeTimers();
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([
        { result: { ok: false, action: "unhide", error: "no_form_context" } },
      ])
      .mockResolvedValueOnce([{ result: { ok: true, action: "unhide", unhidden: 4 } }]);

    vi.stubGlobal("chrome", chromePrefsStub({}, executeScript));

    const promise = applyPowerAppsPreferencesOnTabWithRetries(
      7,
      { hidden: "show", readOnly: "lock" },
      [0],
    );
    await vi.runAllTimersAsync();
    const results = await promise;

    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(results[0]?.ok).toBe(true);
    expect(results[0]?.unhidden).toBe(4);
  });
});

describe("applyPowerAppsPreferencesOnActiveTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty results when enforcement is off", async () => {
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "hide", powerAppsReadOnly: "lock" }, vi.fn()),
    );
    await expect(applyPowerAppsPreferencesOnActiveTab()).resolves.toEqual({
      ok: true,
      results: [],
    });
  });

  it("returns no_active_tab when query has no active tab", async () => {
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        vi.fn(),
        vi.fn().mockResolvedValue([]),
      ),
    );
    const response = await applyPowerAppsPreferencesOnActiveTab();
    expect(response.ok).toBe(false);
    expect(response.results[0]?.error).toBe("no_active_tab");
  });

  it("returns unsupported_host for non-CRM active tab", async () => {
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        vi.fn(),
        vi.fn().mockResolvedValue([{ id: 7, url: "https://example.com/form" }]),
      ),
    );
    const response = await applyPowerAppsPreferencesOnActiveTab();
    expect(response.ok).toBe(false);
    expect(response.results[0]?.error).toBe("unsupported_host");
  });

  it("applies on active CRM tab and reports combined ok", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: true, action: "unhide", unhidden: 3 } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        executeScript,
        vi.fn().mockResolvedValue([{ id: 7, url: "https://org.crm17.dynamics.com/main.aspx" }]),
      ),
    );
    const response = await applyPowerAppsPreferencesOnActiveTab();
    expect(response.ok).toBe(true);
    expect(response.results[0]?.unhidden).toBe(3);
  });

  it("reports ok false when any enforced action fails", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([{ result: { ok: true, action: "unhide", unhidden: 1 } }])
      .mockResolvedValueOnce([
        { result: { ok: false, action: "unlock", error: "no_controls_updated" } },
      ]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "unlock" },
        executeScript,
        vi.fn().mockResolvedValue([{ id: 7, url: "https://org.crm17.dynamics.com/main.aspx" }]),
      ),
    );
    const response = await applyPowerAppsPreferencesOnActiveTab();
    expect(response.ok).toBe(false);
    expect(response.results).toHaveLength(2);
  });

  it("retries no_form_context on the active tab and returns the later success", async () => {
    vi.useFakeTimers();
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([
        { result: { ok: false, action: "unhide", error: "no_form_context" } },
      ])
      .mockResolvedValueOnce([{ result: { ok: true, action: "unhide", unhidden: 2 } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        executeScript,
        vi.fn().mockResolvedValue([{ id: 7, url: "https://org.crm17.dynamics.com/main.aspx" }]),
      ),
    );

    const promise = applyPowerAppsPreferencesOnActiveTab();
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(POPUP_ACTIVE_TAB_RETRY_DELAYS_MS.length).toBeGreaterThan(0);
    expect(executeScript.mock.calls.length).toBeGreaterThan(1);
    expect(response.ok).toBe(true);
    expect(response.results[0]?.unhidden).toBe(2);
    vi.useRealTimers();
  });
});

describe("applyPowerAppsPreferencesToAllHostTabs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPowerAppsTabScheduleState(TAB_ID);
    clearPowerAppsTabScheduleState(99);
  });

  afterEach(() => {
    clearPowerAppsTabScheduleState(TAB_ID);
    clearPowerAppsTabScheduleState(99);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("no-ops when enforcement is off", async () => {
    const query = vi.fn();
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "hide", powerAppsReadOnly: "lock" }, vi.fn(), query),
    );
    await applyPowerAppsPreferencesToAllHostTabs();
    expect(query).not.toHaveBeenCalled();
  });

  it("schedules only Dataverse host tabs", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: true, action: "unhide", unhidden: 1 } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        executeScript,
        vi.fn().mockResolvedValue([
          { id: TAB_ID, url: "https://org.crm17.dynamics.com/main.aspx" },
          { id: 99, url: "https://www.example.com/" },
        ]),
      ),
    );

    await applyPowerAppsPreferencesToAllHostTabs();
    await vi.advanceTimersByTimeAsync(150);

    expect(executeScript).toHaveBeenCalled();
  });
});

describe("schedulePowerAppsApplyForTab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPowerAppsTabScheduleState(TAB_ID);
  });

  afterEach(() => {
    clearPowerAppsTabScheduleState(TAB_ID);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces apply until debounce elapses", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: true, action: "unhide", unhidden: 1 } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    schedulePowerAppsApplyForTab(TAB_ID);
    expect(executeScript).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(150);

    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  it("retries after no_form_context then succeeds", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([
        { result: { ok: false, action: "unhide", error: "no_form_context" } },
      ])
      .mockResolvedValueOnce([{ result: { ok: true, action: "unhide", unhidden: 2 } }]);

    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(300);
    expect(executeScript).toHaveBeenCalledTimes(2);
  });

  it("skips apply when prefs are hide and lock", async () => {
    const executeScript = vi.fn();
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "hide", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);

    expect(executeScript).not.toHaveBeenCalled();
  });
});

describe("installPowerAppsEnforcementListeners", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPowerAppsTabScheduleState(TAB_ID);
  });

  afterEach(() => {
    clearPowerAppsTabScheduleState(TAB_ID);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("schedules apply on tab complete and clears state on tab removed", async () => {
    const onUpdated = vi.fn();
    const onRemoved = vi.fn();
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: true, action: "unhide", unhidden: 0 } }]);

    vi.stubGlobal("chrome", {
      ...chromePrefsStub(
        { powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" },
        executeScript,
      ),
      tabs: {
        onUpdated: { addListener: onUpdated },
        onRemoved: { addListener: onRemoved },
      },
    } as unknown as typeof chrome);

    installPowerAppsEnforcementListeners();
    expect(onUpdated).toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalled();

    const handleUpdated = onUpdated.mock.calls[0]?.[0] as (
      tabId: number,
      changeInfo: { status?: string },
      tab: { url?: string },
    ) => void;
    const handleRemoved = onRemoved.mock.calls[0]?.[0] as (tabId: number) => void;

    handleUpdated(TAB_ID, { status: "loading" }, { url: "https://org.crm17.dynamics.com/" });
    handleUpdated(TAB_ID, { status: "complete" }, { url: "https://www.example.com/" });
    expect(executeScript).not.toHaveBeenCalled();

    handleUpdated(TAB_ID, { status: "complete" }, { url: "https://org.crm17.dynamics.com/" });
    handleRemoved(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).not.toHaveBeenCalled();

    handleUpdated(TAB_ID, { status: "complete" }, { url: "https://org.crm17.dynamics.com/" });
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalled();
  });
});

describe("schedulePowerAppsApplyForTab concurrency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPowerAppsTabScheduleState(TAB_ID);
  });

  afterEach(() => {
    clearPowerAppsTabScheduleState(TAB_ID);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not start a second apply while the first is in flight", async () => {
    const executeScript = vi.fn(
      () =>
        new Promise(() => {
          /* never resolves — keeps inFlight true */
        }),
    );
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(1);

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  it("re-runs once after in-flight apply when another schedule arrived", async () => {
    let resolveFirst!: (value: unknown) => void;
    const executeScript = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue([{ result: { ok: true, action: "unhide", unhidden: 1 } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(1);

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    // Let the second debounced path mark `pending` while the first apply is still open.
    await Promise.resolve();
    await Promise.resolve();
    expect(executeScript).toHaveBeenCalledTimes(1);

    resolveFirst([{ result: { ok: true, action: "unhide", unhidden: 1 } }]);
    await vi.waitFor(() => {
      expect(executeScript).toHaveBeenCalledTimes(2);
    });
  });

  it("does not stack retry timers when apply fails twice before retry fires", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: false, action: "unhide", error: "no_form_context" } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(2);

    executeScript.mockClear();
    await vi.advanceTimersByTimeAsync(300);
    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  it("stops scheduling retries after the backoff cap", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: false, action: "unhide", error: "no_form_context" } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    const callsAfterFirst = executeScript.mock.calls.length;

    for (const delay of [300, 1000, 2000, 2000, 2000, 500]) {
      await vi.advanceTimersByTimeAsync(delay);
    }

    expect(executeScript.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    const totalCalls = executeScript.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(executeScript.mock.calls.length).toBe(totalCalls);
  });
});

describe("clearPowerAppsTabScheduleState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPowerAppsTabScheduleState(TAB_ID);
  });

  afterEach(() => {
    clearPowerAppsTabScheduleState(TAB_ID);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("cancels pending debounced work for a tab", async () => {
    const executeScript = vi.fn();
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    clearPowerAppsTabScheduleState(TAB_ID);
    await vi.advanceTimersByTimeAsync(500);

    expect(executeScript).not.toHaveBeenCalled();
  });

  it("cancels a scheduled retry timer for a tab", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValue([{ result: { ok: false, action: "unhide", error: "no_form_context" } }]);
    vi.stubGlobal(
      "chrome",
      chromePrefsStub({ powerAppsHiddenFields: "show", powerAppsReadOnly: "lock" }, executeScript),
    );

    schedulePowerAppsApplyForTab(TAB_ID);
    await vi.advanceTimersByTimeAsync(150);
    expect(executeScript).toHaveBeenCalledTimes(1);

    clearPowerAppsTabScheduleState(TAB_ID);
    executeScript.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    expect(executeScript).not.toHaveBeenCalled();
  });
});
