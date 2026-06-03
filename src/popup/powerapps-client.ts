import {
  POWERAPPS_MESSAGE,
  type PowerAppsApplyFormActionResponse,
  type PowerAppsFormAction,
} from "../powerapps/constants";

export async function requestPowerAppsFormAction(
  action: PowerAppsFormAction,
): Promise<PowerAppsApplyFormActionResponse> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: POWERAPPS_MESSAGE.APPLY_FORM_ACTION,
      action,
    })) as PowerAppsApplyFormActionResponse | undefined;

    if (response && typeof response === "object" && "ok" in response) {
      return response;
    }
    return { ok: false, action, error: "no_response" };
  } catch {
    return { ok: false, action, error: "message_failed" };
  }
}

export function formatPowerAppsActionError(error: string | undefined): string {
  switch (error) {
    case "unsupported_host":
      return "Open a model-driven app on *.crm.dynamics.com or apps.powerapps.com first.";
    case "no_active_tab":
      return "No active browser tab found.";
    case "no_form_context":
      return "Open a model-driven record form on this tab, then try again.";
    case "no_controls_updated":
      return "No hidden or locked fields were found on this form.";
    case "scripting_unavailable":
      return "Chrome scripting API is not available for this extension.";
    case "injection_failed":
    case "message_failed":
    case "no_response":
      return "Could not apply changes. Reload the form tab and try again.";
    default:
      return "Could not apply changes. Open a model-driven form and try again.";
  }
}

export function formatPowerAppsActionSuccess(
  action: PowerAppsFormAction,
  response: PowerAppsApplyFormActionResponse,
): string {
  if (action === "unhide") {
    const count = response.unhidden ?? 0;
    return count === 1 ? "Unhid 1 element." : `Unhid ${count} elements.`;
  }
  const count = response.unlocked ?? 0;
  return count === 1 ? "Unlocked 1 control." : `Unlocked ${count} controls.`;
}
