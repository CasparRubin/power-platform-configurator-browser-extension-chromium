/** Runtime message from popup → background for model-driven form actions. */
export const POWERAPPS_MESSAGE = {
  APPLY_FORM_ACTION: "pp:powerapps:apply-form-action",
} as const;

export type PowerAppsFormAction = "unhide" | "unlock";

export type PowerAppsFormActionResult = {
  ok: boolean;
  action: PowerAppsFormAction;
  unhidden?: number;
  unlocked?: number;
  error?: string;
};

export type PowerAppsApplyFormActionRequest = {
  type: typeof POWERAPPS_MESSAGE.APPLY_FORM_ACTION;
  action: PowerAppsFormAction;
};

export type PowerAppsApplyFormActionResponse = PowerAppsFormActionResult;

/** URL patterns for model-driven hosts (manifest + tab checks). */
export const POWERAPPS_URL_PATTERNS = [
  "*://*.crm.dynamics.com/*",
  "*://apps.powerapps.com/*",
] as const;

export function isPowerAppsHostUrl(urlValue: string | undefined): boolean {
  if (!urlValue) {
    return false;
  }
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    if (host === "apps.powerapps.com") {
      return true;
    }
    return /\.crm[0-9]*\.dynamics\.com$/i.test(host);
  } catch {
    return false;
  }
}
