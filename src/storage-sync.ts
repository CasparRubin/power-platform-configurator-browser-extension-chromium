import { STORAGE_KEY_ENFORCED_V3, STORAGE_KEY_V3SURVEY_ENABLED } from "./constants";

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
