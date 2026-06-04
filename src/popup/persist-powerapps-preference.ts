import {
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
  type PowerAppsHiddenFieldsMode,
  type PowerAppsReadOnlyMode,
} from "../constants";
import { POWER_APPS_PERSIST_STATUS } from "./persist-status-messages";

export type PersistPowerAppsMountRef = { current: boolean };

/**
 * Writes Power Apps enforcement keys to `chrome.storage.sync`. Background listeners fan out apply
 * to all Dataverse tabs; optional callback runs apply on the active tab for the popup notification area.
 * **Hide** / **Lock** saves skip apply and use `POWER_APPS_PERSIST_STATUS.saved` (reload-the-page hint).
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
  setStatus(POWER_APPS_PERSIST_STATUS.saving);

  try {
    await chrome.storage.sync.set({
      [STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS]: hidden,
      [STORAGE_KEY_POWERAPPS_READ_ONLY]: readOnly,
    });
  } catch {
    if (!mountedRef.current) {
      return;
    }
    setStatus(POWER_APPS_PERSIST_STATUS.saveFailed);
    scheduleStatusClear(4000);
    return;
  } finally {
    endSyncWrite();
  }

  if (!mountedRef.current) {
    return;
  }

  if (onAfterSave) {
    setStatus(POWER_APPS_PERSIST_STATUS.applying);
    try {
      await onAfterSave();
    } catch {
      if (mountedRef.current) {
        setStatus(POWER_APPS_PERSIST_STATUS.applyFailed);
        scheduleStatusClear(4000);
      }
      return;
    }
  } else {
    setStatus(POWER_APPS_PERSIST_STATUS.saved);
    scheduleStatusClear(2000);
    return;
  }

  if (mountedRef.current) {
    scheduleStatusClear(4000);
  }
}
