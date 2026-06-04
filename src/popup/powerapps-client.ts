/** Popup messaging and user-facing strings for the Power Apps notification area (global form enforcement). */
import {
  POWERAPPS_MESSAGE,
  type PowerAppsApplyFormActionResponse,
  type PowerAppsApplyPreferencesActiveTabResponse,
  type PowerAppsFormAction,
} from "../powerapps/constants";

const POPUP_LOG_PREFIX = "[power-platform-configurator] [popup]";

function logPowerAppsResponse(
  action: PowerAppsFormAction,
  response: PowerAppsApplyFormActionResponse,
): void {
  if (!import.meta.env.DEV) {
    return;
  }
  console.log(POPUP_LOG_PREFIX, "powerapps form action", action, response);
}

export async function requestPowerAppsApplyPreferencesOnActiveTab(): Promise<PowerAppsApplyPreferencesActiveTabResponse> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB,
    })) as PowerAppsApplyPreferencesActiveTabResponse | undefined;

    if (response && typeof response === "object" && Array.isArray(response.results)) {
      return response;
    }
    return { ok: false, results: [{ ok: false, action: "unhide", error: "no_response" }] };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      results: [{ ok: false, action: "unhide", error: "message_failed", detail }],
    };
  }
}

export async function requestPowerAppsFormAction(
  action: PowerAppsFormAction,
): Promise<PowerAppsApplyFormActionResponse> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: POWERAPPS_MESSAGE.APPLY_FORM_ACTION,
      action,
    })) as PowerAppsApplyFormActionResponse | undefined;

    if (response && typeof response === "object" && "ok" in response) {
      logPowerAppsResponse(action, response);
      return response;
    }
    const fallback = {
      ok: false,
      action,
      error: "no_response",
    } satisfies PowerAppsApplyFormActionResponse;
    logPowerAppsResponse(action, fallback);
    return fallback;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const fallback = {
      ok: false,
      action,
      error: "message_failed",
      detail,
    } satisfies PowerAppsApplyFormActionResponse;
    logPowerAppsResponse(action, fallback);
    return fallback;
  }
}

function appendDetail(base: string, detail: string | undefined): string {
  if (!detail) {
    return base;
  }
  return `${base} (${detail})`;
}

export function formatPowerAppsActionError(
  error: string | undefined,
  detail?: string,
  framesChecked?: number,
): string {
  const frameHint =
    framesChecked !== undefined && framesChecked > 0
      ? ` Checked ${framesChecked} frame${framesChecked === 1 ? "" : "s"}.`
      : "";

  switch (error) {
    case "unsupported_host":
      return "Open a model-driven app on a Dataverse org URL (e.g. org.crm17.dynamics.com, org.crm.dynamics.cn) or apps.powerapps.com first.";
    case "host_not_permitted":
      return appendDetail(
        "This tab URL is not permitted by the extension. Reload the extension on chrome://extensions, then try again." +
          frameHint,
        detail,
      );
    case "no_active_tab":
      return "No active browser tab found.";
    case "no_form_context":
      return appendDetail(
        "Open a model-driven record form on this tab, then try again." + frameHint,
        detail,
      );
    case "no_controls_updated":
      return appendDetail(
        "No hidden or locked fields were found on this form." + frameHint,
        detail,
      );
    case "scripting_unavailable":
      return appendDetail("Chrome scripting API is not available for this extension.", detail);
    case "inject_no_result":
      return appendDetail(
        "Could not run on this page. Use a record form (not a list or dashboard), reload the tab, and try again." +
          frameHint,
        detail,
      );
    case "injection_failed":
      return appendDetail(
        "Could not inject into the tab. Reload the form tab and try again." + frameHint,
        detail,
      );
    case "message_failed":
      return appendDetail(
        "Could not reach the extension background. Try reloading the extension.",
        detail,
      );
    case "no_response":
      return appendDetail("No response from the extension. Try again.", detail);
    default:
      return appendDetail(
        "Could not apply changes. Open a model-driven record form and try again.",
        detail,
      );
  }
}

export function formatPowerAppsActionSuccess(
  action: PowerAppsFormAction,
  response: PowerAppsApplyFormActionResponse,
): string {
  const frameHint =
    response.framesChecked !== undefined && response.framesChecked > 0
      ? ` (${response.framesChecked} frame${response.framesChecked === 1 ? "" : "s"})`
      : "";

  if (action === "unhide") {
    const count = response.unhidden ?? 0;
    const base = count === 1 ? "Unhid 1 element." : `Unhid ${count} elements.`;
    return base + frameHint;
  }
  const count = response.unlocked ?? 0;
  const base = count === 1 ? "Unlocked 1 control." : `Unlocked ${count} controls.`;
  return base + frameHint;
}
