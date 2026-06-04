/** Runtime messages for model-driven form enforcement. */
export const POWERAPPS_MESSAGE = {
  APPLY_FORM_ACTION: "pp:powerapps:apply-form-action",
  SCHEDULE_APPLY: "pp:powerapps:schedule-apply",
  APPLY_PREFERENCES_ACTIVE_TAB: "pp:powerapps:apply-preferences-active-tab",
} as const;

export type PowerAppsFormAction = "unhide" | "unlock";

/** Result from one injected frame or from `applyPowerAppsFormActionOnTab` aggregation. */
export type PowerAppsFormActionResult = {
  ok: boolean;
  action: PowerAppsFormAction;
  unhidden?: number;
  unlocked?: number;
  /** e.g. `no_form_context`, `no_controls_updated`, `inject_no_result`, `host_not_permitted`, `injection_failed`, `scripting_unavailable`. */
  error?: string;
  /** Human-readable detail (Chrome lastError, frame counts, etc.) for the popup status line. */
  detail?: string;
  /** Number of frames `executeScript` ran in (diagnostics). */
  framesChecked?: number;
};

export type PowerAppsApplyFormActionRequest = {
  type: typeof POWERAPPS_MESSAGE.APPLY_FORM_ACTION;
  action: PowerAppsFormAction;
};

export type PowerAppsApplyFormActionResponse = PowerAppsFormActionResult;

export type PowerAppsScheduleApplyRequest = {
  type: typeof POWERAPPS_MESSAGE.SCHEDULE_APPLY;
};

export type PowerAppsApplyPreferencesActiveTabRequest = {
  type: typeof POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB;
};

export type PowerAppsApplyPreferencesActiveTabResponse = {
  ok: boolean;
  results: PowerAppsFormActionResult[];
};

/**
 * Dataverse org host suffixes for manifest `host_permissions` and runtime host checks.
 * When Microsoft adds a region, update the arrays here and sync `public/manifest.json`
 * (must match `POWERAPPS_HOST_PERMISSIONS` / `POWERAPPS_URL_PATTERNS`; CI drift tests).
 *
 * Commercial `*.dynamics.com` cluster labels (NAM, SAM, CHE, …):
 * @see https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions
 */
export const DATAVERSE_CRM_CLUSTER_LABELS = [
  "crm",
  "crm2",
  "crm3",
  "crm4",
  "crm5",
  "crm6",
  "crm7",
  "crm8",
  "crm9",
  "crm11",
  "crm12",
  "crm14",
  "crm15",
  "crm16",
  "crm17",
  "crm19",
  "crm20",
  "crm21",
] as const;

/**
 * Non–`dynamics.com` org host suffixes from the same Microsoft table (DEU, GCC High, CHN).
 * URLs: `{org}.crm.microsoftdynamics.de`, `{org}.crm.microsoftdynamics.us`, `{org}.crm.dynamics.cn`.
 */
export const DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES = [
  "crm.microsoftdynamics.de",
  "crm.microsoftdynamics.us",
  "crm.dynamics.cn",
] as const;

/** Every org hostname suffix we declare in the manifest (for drift tests vs Microsoft Learn). */
export const DATAVERSE_ORG_HOST_SUFFIXES = [
  ...DATAVERSE_CRM_CLUSTER_LABELS.map((cluster) => `${cluster}.dynamics.com`),
  ...DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES,
] as const;

/** Chrome-valid: `https://*.crm17.dynamics.com/*` matches `oms-test.crm17.dynamics.com`. */
export function dynamicsOrgHostPermission(orgHostSuffix: string): string {
  return `https://*.${orgHostSuffix}/*`;
}

export function dynamicsApiHostPermission(orgHostSuffix: string): string {
  return `https://*.api.${orgHostSuffix}/*`;
}

export function dynamicsOrgUrlPattern(orgHostSuffix: string): string {
  return `*://*.${orgHostSuffix}/*`;
}

export const POWERAPPS_DYNAMICS_ORG_HOST_PERMISSIONS = DATAVERSE_ORG_HOST_SUFFIXES.map((suffix) =>
  dynamicsOrgHostPermission(suffix),
);

export const POWERAPPS_DYNAMICS_API_HOST_PERMISSIONS = DATAVERSE_ORG_HOST_SUFFIXES.map((suffix) =>
  dynamicsApiHostPermission(suffix),
);

/**
 * Content-script match patterns (org hosts only; API shards are not form UIs).
 * One leading `*` per host — patterns like `*.*.dynamics.com` are rejected by Chrome.
 */
export const POWERAPPS_URL_PATTERNS = [
  ...DATAVERSE_ORG_HOST_SUFFIXES.map((suffix) => dynamicsOrgUrlPattern(suffix)),
  "*://apps.powerapps.com/*",
] as const;

/** Manifest host_permissions for Dataverse / Power Apps (keep in sync with public/manifest.json). */
export const POWERAPPS_HOST_PERMISSIONS = [
  ...POWERAPPS_DYNAMICS_ORG_HOST_PERMISSIONS,
  ...POWERAPPS_DYNAMICS_API_HOST_PERMISSIONS,
  "https://apps.powerapps.com/*",
] as const;

/** True when hostname is `{org}.{suffix}` for a known Dataverse org suffix. */
export function hostMatchesDataverseOrgSuffix(hostname: string, suffix: string): boolean {
  const lower = hostname.toLowerCase();
  const normalized = suffix.toLowerCase();
  const needle = `.${normalized}`;
  return lower.endsWith(needle) && lower.length > needle.length;
}

/** True when hostname is a model-driven org URL we declare in the manifest. */
export function hostMatchesDynamicsOrgPattern(hostname: string): boolean {
  return DATAVERSE_ORG_HOST_SUFFIXES.some((suffix) =>
    hostMatchesDataverseOrgSuffix(hostname, suffix),
  );
}

/** True when hostname is covered by a declared Power Apps manifest host pattern. */
export function hostMatchesPowerAppsManifestPattern(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "apps.powerapps.com") {
    return true;
  }
  return hostMatchesDynamicsOrgPattern(lower);
}

export function isPowerAppsHostUrl(urlValue: string | undefined): boolean {
  if (!urlValue) {
    return false;
  }
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    if (host === "apps.powerapps.com") {
      return true;
    }
    if (hostMatchesDynamicsOrgPattern(host)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Chrome allows at most one `*` in the host, and only as the first character. */
export function isValidChromeHostMatchPattern(pattern: string): boolean {
  const match = pattern.match(/^[a-z*]+:\/\/([^/]+)/i);
  if (!match) {
    return false;
  }
  const host = match[1]!;
  const starCount = (host.match(/\*/g) ?? []).length;
  if (starCount === 0) {
    return true;
  }
  if (starCount !== 1) {
    return false;
  }
  return host.startsWith("*.") || host === "*";
}
