/**
 * Popup / content script → service worker: schedule and apply global Power Apps form prefs.
 */
import {
  applyPowerAppsPreferencesOnActiveTab,
  applyPowerAppsPreferencesToAllHostTabs,
  schedulePowerAppsApplyForTab,
} from "../powerapps/apply-preferences";
import {
  POWERAPPS_MESSAGE,
  type PowerAppsApplyPreferencesActiveTabRequest,
  type PowerAppsApplyPreferencesActiveTabResponse,
  type PowerAppsScheduleApplyRequest,
} from "../powerapps/constants";

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

    return false;
  });
}

async function handleApplyPreferencesActiveTab(): Promise<PowerAppsApplyPreferencesActiveTabResponse> {
  return applyPowerAppsPreferencesOnActiveTab();
}

/** Fan-out when sync prefs change (called from background storage listener). */
export function onPowerAppsSyncStorageChanged(): void {
  void applyPowerAppsPreferencesToAllHostTabs();
}
