import { afterEach, describe, expect, it, vi } from "vitest";
import { persistPowerAppsPreference } from "../src/popup/persist-powerapps-preference";
import { POWER_APPS_PERSIST_STATUS } from "../src/popup/persist-status-messages";

describe("persistPowerAppsPreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes both keys to chrome.storage.sync", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const mountedRef = { current: true };
    const setStatus = vi.fn();
    const beginSyncWrite = vi.fn();
    const endSyncWrite = vi.fn();

    await persistPowerAppsPreference({
      hidden: "show",
      readOnly: "unlock",
      mountedRef,
      beginSyncWrite,
      endSyncWrite,
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
    });

    expect(set).toHaveBeenCalledWith({
      powerAppsHiddenFields: "show",
      powerAppsReadOnly: "unlock",
    });
    expect(beginSyncWrite).toHaveBeenCalled();
    expect(endSyncWrite).toHaveBeenCalled();
  });

  it("returns silently when unmounted after storage.set throws", async () => {
    const set = vi.fn().mockImplementation(async () => {
      throw new Error("quota");
    });
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const mountedRef = { current: true };
    const setStatus = vi.fn();
    const promise = persistPowerAppsPreference({
      hidden: "hide",
      readOnly: "lock",
      mountedRef,
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
    });
    mountedRef.current = false;
    await promise;
    expect(setStatus).not.toHaveBeenCalledWith(POWER_APPS_PERSIST_STATUS.saveFailed);
  });

  it("reports save failure when storage.set throws", async () => {
    const set = vi.fn().mockRejectedValue(new Error("quota"));
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const setStatus = vi.fn();
    const mountedRef = { current: true };

    await persistPowerAppsPreference({
      hidden: "hide",
      readOnly: "lock",
      mountedRef,
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
    });

    expect(setStatus).toHaveBeenCalledWith(POWER_APPS_PERSIST_STATUS.saveFailed);
  });

  it("reports saved when no active-tab apply callback is requested", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const setStatus = vi.fn();
    await persistPowerAppsPreference({
      hidden: "hide",
      readOnly: "lock",
      mountedRef: { current: true },
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
    });

    expect(setStatus.mock.calls.map(([message]) => message)).toEqual([
      POWER_APPS_PERSIST_STATUS.saving,
      POWER_APPS_PERSIST_STATUS.saved,
    ]);
  });

  it("runs onAfterSave when callback is provided", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const onAfterSave = vi.fn().mockResolvedValue(undefined);
    const mountedRef = { current: true };

    await persistPowerAppsPreference({
      hidden: "show",
      readOnly: "lock",
      mountedRef,
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus: vi.fn(),
      scheduleStatusClear: vi.fn(),
      onAfterSave,
    });

    expect(onAfterSave).toHaveBeenCalled();
    expect(set.mock.invocationCallOrder[0]).toBeLessThan(onAfterSave.mock.invocationCallOrder[0]);
  });

  it("exits early when unmounted before save completes", async () => {
    const set = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 10);
        }),
    );
    vi.stubGlobal("chrome", {
      storage: { sync: { set } },
    } as unknown as typeof chrome);

    const mountedRef = { current: true };
    const setStatus = vi.fn();
    const onAfterSave = vi.fn();
    const promise = persistPowerAppsPreference({
      hidden: "show",
      readOnly: "lock",
      mountedRef,
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
      onAfterSave,
    });
    mountedRef.current = false;
    await promise;
    expect(onAfterSave).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalledWith(POWER_APPS_PERSIST_STATUS.applying);
  });

  it("reports apply failure when onAfterSave throws", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { set: vi.fn().mockResolvedValue(undefined) } },
    } as unknown as typeof chrome);

    const setStatus = vi.fn();
    await persistPowerAppsPreference({
      hidden: "show",
      readOnly: "lock",
      mountedRef: { current: true },
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
      onAfterSave: vi.fn().mockRejectedValue(new Error("apply failed")),
    });

    expect(setStatus).toHaveBeenCalledWith(POWER_APPS_PERSIST_STATUS.applyFailed);
  });

  it("does not set apply error status when unmounted before onAfterSave catch", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { set: vi.fn().mockResolvedValue(undefined) } },
    } as unknown as typeof chrome);

    const mountedRef = { current: true };
    const setStatus = vi.fn();
    await persistPowerAppsPreference({
      hidden: "show",
      readOnly: "lock",
      mountedRef,
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus,
      scheduleStatusClear: vi.fn(),
      onAfterSave: async () => {
        mountedRef.current = false;
        throw new Error("apply failed");
      },
    });

    expect(setStatus).not.toHaveBeenCalledWith(POWER_APPS_PERSIST_STATUS.applyFailed);
  });

  it("schedules status clear after successful onAfterSave", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { set: vi.fn().mockResolvedValue(undefined) } },
    } as unknown as typeof chrome);

    const scheduleStatusClear = vi.fn();
    await persistPowerAppsPreference({
      hidden: "show",
      readOnly: "lock",
      mountedRef: { current: true },
      beginSyncWrite: vi.fn(),
      endSyncWrite: vi.fn(),
      clearPendingStatusDismiss: vi.fn(),
      setStatus: vi.fn(),
      scheduleStatusClear,
      onAfterSave: vi.fn().mockResolvedValue(undefined),
    });

    expect(scheduleStatusClear).toHaveBeenCalledWith(4000);
  });
});
