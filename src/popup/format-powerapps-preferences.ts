/**
 * Maps active-tab apply results to popup notification `{ message, variant }`.
 * Retryable form-context and injection misses use informational deferred copy;
 * non-retryable host, permission, and messaging failures stay errors.
 */
import type { PowerAppsFormAction, PowerAppsFormActionResult } from "../powerapps/constants";
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
      message:
        "Preference saved. Automatic actions are off until you choose Reveal hidden elements or Enable disabled controls.",
      variant: "success",
    };
  }

  const successLines: string[] = [];
  const hardErrorLines: string[] = [];
  const benignActions = new Set<PowerAppsFormAction>();
  let hasRetryable = false;

  for (const result of response.results) {
    if (result.ok) {
      successLines.push(formatPowerAppsActionSuccessForNotification(result.action, result));
    } else if (shouldRetryApplyError(result.error)) {
      hasRetryable = true;
    } else if (isBenignApplyError(result.error)) {
      benignActions.add(result.action);
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

  if (successLines.length > 0 && !hasRetryable && benignActions.size === 0) {
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

  if (successLines.length > 0 && benignActions.size > 0) {
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

  if (benignActions.size > 0) {
    const message =
      benignActions.size === 2
        ? POWER_APPS_PERSIST_STATUS.savedNothingToRevealOrUnlock
        : benignActions.has("unhide")
          ? POWER_APPS_PERSIST_STATUS.savedNothingToReveal
          : POWER_APPS_PERSIST_STATUS.savedNothingToUnlock;
    return {
      message,
      variant: "info",
    };
  }

  /* v8 ignore next -- exhaustive guard; all non-empty result sets are classified above */
  throw new Error("Unexpected apply outcome");
}
