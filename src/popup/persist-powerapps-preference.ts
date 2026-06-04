import {
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
  type PowerAppsHiddenFieldsMode,
  type PowerAppsReadOnlyMode,
} from "../constants";

export type PersistPowerAppsMountRef = { current: boolean };

/**
 * Writes Power Apps enforcement keys to `chrome.storage.sync`. Background listeners fan out apply
 * to all Dataverse tabs; optional callback runs apply on the active tab for popup status text.
 */
export async function persistPowerAppsPreference(options: {
  hidden: PowerAppsHiddenFieldsMode;
  readOnly: PowerAppsReadOnlyMode;
  mountedRef: PersistPowerAppsMountRef;
  beginSyncWrite: () => void;
  endSyncWrite: () => void;
  clearPendingStatusDismiss: () => void;
  setStatus: (message: string) => void;
  scheduleStatusClear: (clearAfterMs: number) => void;
  onAfterSave?: () => Promise<void>;
}): Promise<void> {
  const {
    hidden,
    readOnly,
    mountedRef,
    beginSyncWrite,
    endSyncWrite,
    clearPendingStatusDismiss,
    setStatus,
    scheduleStatusClear,
    onAfterSave,
  } = options;

  clearPendingStatusDismiss();
  beginSyncWrite();
  setStatus("Saving preference…");

  try {
    await chrome.storage.sync.set({
      [STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS]: hidden,
      [STORAGE_KEY_POWERAPPS_READ_ONLY]: readOnly,
    });
  } catch {
    if (!mountedRef.current) {
      return;
    }
    setStatus("Could not save preference. Try again.");
    scheduleStatusClear(4000);
    return;
  } finally {
    endSyncWrite();
  }

  if (!mountedRef.current) {
    return;
  }

  if (onAfterSave) {
    setStatus("Applying…");
    try {
      await onAfterSave();
    } catch {
      if (mountedRef.current) {
        setStatus("Preference saved; could not apply on the active tab.");
        scheduleStatusClear(4000);
      }
      return;
    }
  } else {
    setStatus("Preference saved.");
    scheduleStatusClear(2000);
    return;
  }

  if (mountedRef.current) {
    scheduleStatusClear(4000);
  }
}
