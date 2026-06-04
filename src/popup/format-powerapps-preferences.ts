import type { PowerAppsApplyPreferencesActiveTabResponse } from "../powerapps/constants";
import { formatPowerAppsActionError, formatPowerAppsActionSuccess } from "./powerapps-client";

export function formatPowerAppsPreferencesApplyStatus(
  response: PowerAppsApplyPreferencesActiveTabResponse,
): string {
  if (response.results.length === 0) {
    return "Preference saved. Enforcement is off until you choose Show or Unlock.";
  }

  const parts: string[] = [];
  for (const result of response.results) {
    if (result.ok) {
      parts.push(formatPowerAppsActionSuccess(result.action, result));
    } else {
      parts.push(formatPowerAppsActionError(result.error, result.detail, result.framesChecked));
    }
  }
  return parts.join(" ");
}
