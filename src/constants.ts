/** Query param value for `v3` when enforcement is active (`true` or `false`). */
export type EnforcedV3 = "true" | "false";

/** Stored user preference: enforce v3=true, v3=false, or pause all enforcement (`off`). */
export type EnforcementPreference = EnforcedV3 | "off";

/** Sync storage key; value is {@link EnforcementPreference} (`"true"` | `"false"` | `"off"`). */
export const STORAGE_KEY_ENFORCED_V3 = "enforcedV3" as const;

/**
 * Sync key for the popup Power Automate survey prompt (v3survey). When `"false"` (default, **Hide**),
 * rewrites set `v3survey=false` (adds if missing). When `"true"` (**Show**), if any `v3survey` key is
 * present on the URL it is normalized to `v3survey=true`; the extension does not add `v3survey` when absent.
 */
export const STORAGE_KEY_V3SURVEY_ENABLED = "v3surveyEnabled" as const;

/** Keys loaded together by the service worker, content script, and popup. */
export const SYNC_POLICY_KEYS = [STORAGE_KEY_ENFORCED_V3, STORAGE_KEY_V3SURVEY_ENABLED] as const;

/**
 * Sync key: global model-driven form hidden-fields mode (`"hide"` default, `"show"` enforces unhide on
 * every eligible tab until switched back).
 */
export const STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS = "powerAppsHiddenFields" as const;

/**
 * Sync key: global model-driven form read-only mode (`"lock"` default, `"unlock"` enforces unlock on
 * every eligible tab until switched back).
 */
export const STORAGE_KEY_POWERAPPS_READ_ONLY = "powerAppsReadOnly" as const;

/** Keys loaded for global Power Apps form enforcement. */
export const POWERAPPS_SYNC_KEYS = [
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
] as const;

export type PowerAppsHiddenFieldsMode = "hide" | "show";
export type PowerAppsReadOnlyMode = "lock" | "unlock";

export type PowerAppsPreferences = {
  hidden: PowerAppsHiddenFieldsMode;
  readOnly: PowerAppsReadOnlyMode;
};

export const DEFAULT_POWERAPPS_HIDDEN_FIELDS: PowerAppsHiddenFieldsMode = "hide";
export const DEFAULT_POWERAPPS_READ_ONLY: PowerAppsReadOnlyMode = "lock";

/** Local storage key for popup UI theme (`"light"` | `"dark"`). */
export const STORAGE_KEY_POPUP_THEME = "popupThemePreference" as const;

export const DNR_RULESET_CLASSIC_EDITOR_ID = "dnr-classic-editor" as const;
export const DNR_RULESET_NEW_DESIGNER_ID = "dnr-new-designer" as const;

export const DEFAULT_ENFORCED_V3: EnforcedV3 = "false";

/** Default when storage is missing or invalid (same as classic editor). */
export const DEFAULT_ENFORCEMENT_PREFERENCE: EnforcementPreference = DEFAULT_ENFORCED_V3;

export function parseEnforcementPreference(value: unknown): EnforcementPreference {
  if (value === "true") {
    return "true";
  }
  if (value === "false") {
    return "false";
  }
  if (value === "off") {
    return "off";
  }
  return DEFAULT_ENFORCEMENT_PREFERENCE;
}

/** True when install-time seeding should write {@link DEFAULT_ENFORCEMENT_PREFERENCE}. */
export function needsDefaultEnforcedV3Seed(raw: unknown): boolean {
  return raw !== "true" && raw !== "false" && raw !== "off";
}

/** True when install-time seeding should write `"false"` for survey Hide (`v3surveyEnabled`). */
export function needsDefaultV3SurveyEnabledSeed(raw: unknown): boolean {
  return raw !== "true" && raw !== "false";
}

/**
 * `true` when sync stores `"true"` (survey **Show** — normalize in-URL `v3survey` to `true` only).
 * `false` or missing means **Hide** (default): `v3survey=false` on rewrites.
 */
export function parseV3SurveyEnabled(value: unknown): boolean {
  return value === "true";
}

export function parsePowerAppsHiddenFieldsMode(value: unknown): PowerAppsHiddenFieldsMode {
  if (value === "show") {
    return "show";
  }
  return DEFAULT_POWERAPPS_HIDDEN_FIELDS;
}

export function parsePowerAppsReadOnlyMode(value: unknown): PowerAppsReadOnlyMode {
  if (value === "unlock") {
    return "unlock";
  }
  return DEFAULT_POWERAPPS_READ_ONLY;
}

export function parsePowerAppsPreferencesFromSync(
  result: Record<string, unknown>,
): PowerAppsPreferences {
  return {
    hidden: parsePowerAppsHiddenFieldsMode(result[STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS]),
    readOnly: parsePowerAppsReadOnlyMode(result[STORAGE_KEY_POWERAPPS_READ_ONLY]),
  };
}

export function needsDefaultPowerAppsHiddenFieldsSeed(raw: unknown): boolean {
  return raw !== "hide" && raw !== "show";
}

export function needsDefaultPowerAppsReadOnlySeed(raw: unknown): boolean {
  return raw !== "lock" && raw !== "unlock";
}
