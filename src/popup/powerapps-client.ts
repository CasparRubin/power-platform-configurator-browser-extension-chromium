/** Popup messaging and user-facing strings for the Power Apps notification area (global form enforcement). */
import {
  POWERAPPS_MESSAGE,
  type PowerAppsApplyPreferencesActiveTabResponse,
  type PowerAppsFormAction,
  type PowerAppsFormActionResult,
} from "../powerapps/constants";

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

function appendDetail(base: string, detail: string | undefined): string {
  if (!detail) {
    return base;
  }
  return `${base} (${detail})`;
}

function formatPowerAppsActionErrorMessage(
  error: string | undefined,
  detail: string | undefined,
): string {
  switch (error) {
    case "unsupported_host":
      return "Open a model-driven app on a Dataverse org URL (e.g. org.crm17.dynamics.com, org.crm.dynamics.cn) or apps.powerapps.com first.";
    case "host_not_permitted":
      return appendDetail(
        "This tab URL is not permitted by the extension. Open your browser's extensions page, confirm site access, reload the extension if available, then try again.",
        detail,
      );
    case "no_active_tab":
      return "No active browser tab found.";
    case "no_form_context":
      return appendDetail(
        "No model-driven record form was available on this tab. Open or reload a record form and try again.",
        detail,
      );
    case "no_controls_updated":
      return appendDetail("No applicable form elements needed changing.", detail);
    case "scripting_unavailable":
      return appendDetail("The browser scripting API is not available for this extension.", detail);
    case "inject_no_result":
      return appendDetail(
        "Could not run on this page. Use a record form (not a list or dashboard), reload the page, and try again.",
        detail,
      );
    case "injection_failed":
      return appendDetail("Could not inject into the tab. Reload the page and try again.", detail);
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

/** User-facing errors omit a separate frame summary; optional diagnostic detail may be appended. */
export function formatPowerAppsActionErrorForNotification(
  error: string | undefined,
  detail?: string,
): string {
  return formatPowerAppsActionErrorMessage(error, detail);
}

/** User-facing popup notification success (no frame counts). */
export function formatPowerAppsActionSuccessForNotification(
  action: PowerAppsFormAction,
  response: PowerAppsFormActionResult,
): string {
  if (action === "unhide") {
    const count = response.unhidden ?? 0;
    return count === 1 ? "Revealed 1 element." : `Revealed ${count} elements.`;
  }
  const count = response.unlocked ?? 0;
  return count === 1 ? "Enabled 1 control." : `Enabled ${count} controls.`;
}
