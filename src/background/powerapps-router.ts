import { applyPowerAppsFormActionOnTab } from "../powerapps/apply-form-actions";
import {
  isPowerAppsHostUrl,
  POWERAPPS_MESSAGE,
  type PowerAppsApplyFormActionRequest,
  type PowerAppsApplyFormActionResponse,
} from "../powerapps/constants";

function isApplyFormActionMessage(message: unknown): message is PowerAppsApplyFormActionRequest {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const record = message as Record<string, unknown>;
  return (
    record.type === POWERAPPS_MESSAGE.APPLY_FORM_ACTION &&
    (record.action === "unhide" || record.action === "unlock")
  );
}

export function installPowerAppsRouter(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isApplyFormActionMessage(message)) {
      return false;
    }

    void (async () => {
      const response = await handleApplyFormAction(message);
      sendResponse(response);
    })();

    return true;
  });
}

async function handleApplyFormAction(
  request: PowerAppsApplyFormActionRequest,
): Promise<PowerAppsApplyFormActionResponse> {
  const { action } = request;

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id === undefined) {
    return { ok: false, action, error: "no_active_tab" };
  }

  if (!isPowerAppsHostUrl(activeTab.url)) {
    return { ok: false, action, error: "unsupported_host" };
  }

  return applyPowerAppsFormActionOnTab(activeTab.id, action);
}
