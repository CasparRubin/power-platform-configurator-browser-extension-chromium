/**
 * User-facing status strings from persist helpers (`persist-policy-preference.ts`,
 * `persist-powerapps-preference.ts`). Kept in sync with `tests/persist-status-messages.test.ts`
 * and `infer-settings-status-variant.ts`.
 */
export const POWER_AUTOMATE_PERSIST_STATUS = {
  saving: "Saving preference…",
  refreshing: "Refreshing open Power Automate tab…",
  saved: "Saved.",
  savedReloaded: "Saved. Reloaded the open flow or run page.",
  savedReloadPage: "Saved. Reload the flow or run page to apply.",
} as const;

export const POWER_APPS_PERSIST_STATUS = {
  saving: "Saving preference…",
  applying: "Applying…",
  saved: "Preference saved. Reload the page on open record forms to apply.",
  saveFailed: "Could not save preference. Try again.",
  applyFailed:
    "Preference saved; could not apply on the active tab. Reload the page and try again.",
} as const;
