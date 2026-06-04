import {
  STORAGE_KEY_ENFORCED_V3,
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
  STORAGE_KEY_V3SURVEY_ENABLED,
} from "./constants";

/**
 * True when `chrome.storage.sync` changed for a key the extension reads for URL policy: flow
 * designer mode (`enforcedV3`) or survey prompt (`v3surveyEnabled`, `"true"` / `"false"` in storage).
 */
export function isConfiguratorSyncChange(
  areaName: string,
  changes: Record<string, unknown>,
): boolean {
  if (areaName !== "sync") {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY_ENFORCED_V3) ||
    Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY_V3SURVEY_ENABLED)
  );
}

/** True when sync changed for global Power Apps form enforcement keys. */
export function isPowerAppsSyncChange(areaName: string, changes: Record<string, unknown>): boolean {
  if (areaName !== "sync") {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS) ||
    Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY_POWERAPPS_READ_ONLY)
  );
}
