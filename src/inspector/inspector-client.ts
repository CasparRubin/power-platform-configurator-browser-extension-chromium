import {
  INSPECTOR_MESSAGE,
  type InspectorSessionStatusMessage,
  type InspectorTabContextMessage,
} from "./session-bridge";
import { inspectorLog } from "./debug-log";

export async function getSessionStatus(): Promise<InspectorSessionStatusMessage> {
  inspectorLog.debug("session", "Requesting session status from background…");
  const response = await chrome.runtime.sendMessage({
    type: INSPECTOR_MESSAGE.SESSION_STATUS,
  });
  const status = response as InspectorSessionStatusMessage;
  inspectorLog.info("session", "Session status received", {
    connected: status.connected,
    bridgeTabId: status.bridgeTabId,
    bridgeTabUrl: status.bridgeTabUrl,
    hasToken: status.hasToken,
    message: status.message,
    debug: status.debug,
  });
  return status;
}

export async function openConnectTab(): Promise<number> {
  inspectorLog.info("session", "Opening Power Automate connect tab…");
  const response = (await chrome.runtime.sendMessage({
    type: INSPECTOR_MESSAGE.OPEN_CONNECT_TAB,
  })) as { tabId?: number };
  const tabId = response?.tabId ?? -1;
  inspectorLog.info("session", "Connect tab opened", { tabId });
  return tabId;
}

export async function getActiveTabContext(): Promise<InspectorTabContextMessage> {
  const response = await chrome.runtime.sendMessage({
    type: INSPECTOR_MESSAGE.GET_TAB_CONTEXT,
  });
  const ctx = response as InspectorTabContextMessage;
  inspectorLog.debug("context", "Active tab context", ctx);
  return ctx;
}

export async function syncFromActiveTab(): Promise<InspectorTabContextMessage> {
  inspectorLog.info("context", "Sync from active tab…");
  const response = await chrome.runtime.sendMessage({
    type: INSPECTOR_MESSAGE.SYNC_FROM_ACTIVE_TAB,
  });
  const ctx = response as InspectorTabContextMessage;
  inspectorLog.info("context", "Synced tab context", ctx);
  return ctx;
}
