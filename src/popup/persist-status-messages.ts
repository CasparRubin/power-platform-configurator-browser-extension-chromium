/**
 * User-facing status strings from persist helpers (`persist-policy-preference.ts`,
 * `persist-powerapps-preference.ts`) and `format-powerapps-preferences.ts` apply outcomes.
 * Kept in sync with `tests/persist-status-messages.test.ts` (Power Automate infer) and
 * `format-powerapps-preferences.ts` apply outcomes.
 */
export const POWER_AUTOMATE_PERSIST_STATUS = {
  saving: "Saving preference…",
  refreshing: "Refreshing the active Power Automate tab…",
  saveFailed:
    "Could not save preference. Try again; if the problem continues, reload the extension.",
  saved: "Saved.",
  savedReloaded: "Saved. Reloaded the active flow or run page.",
  savedReloadPage: "Saved. Reload the flow or run page to apply.",
} as const;

export const POWER_APPS_PERSIST_STATUS = {
  saving: "Saving preference…",
  applying: "Applying…",
  saved: "Preference saved. Reload open record forms to restore platform defaults.",
  saveFailed: "Could not save preference. Try again.",
  applyFailed:
    "Preference saved; could not apply on the active tab. Reload the page and try again.",
  /** Sync saved; active-tab apply could not complete after short retries. */
  savedApplyDeferred:
    "Preference saved, but it could not be applied to the active tab. Open or reload a model-driven record form.",
  savedNothingToReveal: "Preference saved. No hidden tabs, sections, or controls needed revealing.",
  savedNothingToUnlock: "Preference saved. No disabled controls needed unlocking.",
  savedNothingToRevealOrUnlock:
    "Preference saved. No hidden tabs, sections, or controls needed revealing, and no disabled controls needed unlocking.",
  applyFinishRemaining: "Open or reload a model-driven record form to apply the remaining changes.",
} as const;
