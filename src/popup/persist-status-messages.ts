/** User-facing status strings from persist helpers; kept in sync with tests. */
export const POWER_AUTOMATE_PERSIST_STATUS = {
  saving: "Saving preference…",
  refreshing: "Refreshing open Power Automate tab…",
  saved: "Saved.",
} as const;

export const POWER_APPS_PERSIST_STATUS = {
  saving: "Saving preference…",
  applying: "Applying…",
  saved: "Preference saved.",
  saveFailed: "Could not save preference. Try again.",
  applyFailed: "Preference saved; could not apply on the active tab.",
} as const;
