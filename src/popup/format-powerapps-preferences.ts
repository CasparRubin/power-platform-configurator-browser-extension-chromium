/**
 * Maps active-tab apply results to popup notification `{ message, variant }`.
 * Retryable misses (form still loading) use info copy from `persist-status-messages.ts`;
 * hard host/inject failures stay error; successes omit frame diagnostics.
 */
import type { PowerAppsFormActionResult } from "../powerapps/constants";
import { shouldRetryApplyError } from "../powerapps/apply-preferences";
import type { PowerAppsApplyPreferencesActiveTabResponse } from "../powerapps/constants";
import type { SettingsStatusVariant } from "./infer-settings-status-variant";
import { POWER_APPS_PERSIST_STATUS } from "./persist-status-messages";
import {
  formatPowerAppsActionErrorForNotification,
  formatPowerAppsActionSuccessForNotification,
} from "./powerapps-client";

type PowerAppsApplyStatus = {
  message: string;
  variant: SettingsStatusVariant;
};

function isBenignApplyError(error: string | undefined): boolean {
  return error === "no_controls_updated";
}

function formatHardError(result: PowerAppsFormActionResult): string {
  return formatPowerAppsActionErrorForNotification(result.error, result.detail);
}

export function formatPowerAppsPreferencesApplyStatus(
  response: PowerAppsApplyPreferencesActiveTabResponse,
): PowerAppsApplyStatus {
  if (response.results.length === 0) {
    return {
      message: "Preference saved. Enforcement is off until you choose Show or Unlock.",
      variant: "success",
    };
  }

  const successLines: string[] = [];
  const hardErrorLines: string[] = [];
  let hasRetryable = false;
  let hasBenign = false;

  for (const result of response.results) {
    if (result.ok) {
      successLines.push(formatPowerAppsActionSuccessForNotification(result.action, result));
    } else if (shouldRetryApplyError(result.error)) {
      hasRetryable = true;
    } else if (isBenignApplyError(result.error)) {
      hasBenign = true;
    } else {
      hardErrorLines.push(formatHardError(result));
    }
  }

  if (hardErrorLines.length > 0) {
    return {
      message: hardErrorLines.join(" "),
      variant: "error",
    };
  }

  if (successLines.length > 0 && !hasRetryable && !hasBenign) {
    return {
      message: successLines.join(" "),
      variant: "success",
    };
  }

  if (successLines.length > 0 && hasRetryable) {
    return {
      message: `${successLines.join(" ")} ${POWER_APPS_PERSIST_STATUS.applyFinishRemaining}`,
      variant: "info",
    };
  }

  if (successLines.length > 0 && hasBenign) {
    return {
      message: successLines.join(" "),
      variant: "success",
    };
  }

  if (hasRetryable) {
    return {
      message: POWER_APPS_PERSIST_STATUS.savedApplyDeferred,
      variant: "info",
    };
  }

  if (hasBenign) {
    return {
      message: POWER_APPS_PERSIST_STATUS.savedNoControlsOnForm,
      variant: "info",
    };
  }

  /* v8 ignore next -- exhaustive guard; all non-empty result sets are classified above */
  throw new Error("Unexpected apply outcome");
}
