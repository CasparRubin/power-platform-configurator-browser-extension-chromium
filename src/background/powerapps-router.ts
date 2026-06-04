/**
 * Popup / content script → service worker: schedule and apply global Power Apps form prefs.
 */
import {
  applyPowerAppsPreferencesOnActiveTab,
  applyPowerAppsPreferencesToAllHostTabs,
  schedulePowerAppsApplyForTab,
} from "../powerapps/apply-preferences";
import { applyPowerAppsFormActionOnTab } from "../powerapps/apply-form-actions";
import {
  isPowerAppsHostUrl,
  POWERAPPS_MESSAGE,
  type PowerAppsApplyFormActionRequest,
  type PowerAppsApplyFormActionResponse,
  type PowerAppsApplyPreferencesActiveTabRequest,
  type PowerAppsApplyPreferencesActiveTabResponse,
  type PowerAppsScheduleApplyRequest,
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

function isScheduleApplyMessage(message: unknown): message is PowerAppsScheduleApplyRequest {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  return (message as Record<string, unknown>).type === POWERAPPS_MESSAGE.SCHEDULE_APPLY;
}

function isApplyPreferencesActiveTabMessage(
  message: unknown,
): message is PowerAppsApplyPreferencesActiveTabRequest {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  return (
    (message as Record<string, unknown>).type === POWERAPPS_MESSAGE.APPLY_PREFERENCES_ACTIVE_TAB
  );
}

export function installPowerAppsRouter(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isScheduleApplyMessage(message)) {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        schedulePowerAppsApplyForTab(tabId);
      }
      return false;
    }

    if (isApplyPreferencesActiveTabMessage(message)) {
      void (async () => {
        const response = await handleApplyPreferencesActiveTab();
        sendResponse(response);
      })();
      return true;
    }

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

async function handleApplyPreferencesActiveTab(): Promise<PowerAppsApplyPreferencesActiveTabResponse> {
  return applyPowerAppsPreferencesOnActiveTab();
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

/** Fan-out when sync prefs change (called from background storage listener). */
export function onPowerAppsSyncStorageChanged(): void {
  void applyPowerAppsPreferencesToAllHostTabs();
}
