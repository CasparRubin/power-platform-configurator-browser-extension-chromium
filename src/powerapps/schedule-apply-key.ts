/** Stable key for debouncing schedule-apply signals from a content script (href changes on SPA nav). */
export function getPowerAppsScheduleHrefKey(href: string): string {
  try {
    return new URL(href).href;
  } catch {
    return href;
  }
}
