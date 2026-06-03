/**

 * Routes inspector API calls from the side panel to a Power Automate content-script bridge tab.

 */

import { injectContentIntoPowerAutomateTabs, injectMainWorldHookOnTab } from "./bridge-injection";
import { fetchInspectorApiInBackground, isResolveTokenResponse } from "./inspector-api-fetch";
import {
  canProxyApiToPortal,
  fetchInspectorApiInPageMainWorld,
} from "./inspector-page-execute-fetch";
import { fetchInspectorApiViaPageSession, isPageApiResponse } from "./inspector-page-fetch";
import { enqueueTabOperation } from "./tab-message-queue";

import { parsePowerAutomateTabContext } from "../inspector/context-url";

import { isMissingContentScriptError, pickBridgeTab } from "../inspector/bridge-tab";

import {
  INSPECTOR_MESSAGE,
  createRequestId,
  isInspectorApiRequest,
  type InspectorApiRequestMessage,
  type InspectorApiResponseMessage,
  type InspectorAudience,
  type InspectorSessionStatusMessage,
  type InspectorTabContextMessage,
} from "../inspector/session-bridge";

const CONNECT_URL = "https://make.powerautomate.com";

const MESSAGE_TIMEOUT_MS = 30_000;
const BRIDGE_INJECT_SETTLE_MS = 300;
const TAB_READY_MAX_MS = 8_000;

async function queryPowerAutomateTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ url: ["*://*.powerautomate.com/*", "*://flow.microsoft.com/*"] });
}

async function findBridgeTab(): Promise<chrome.tabs.Tab | null> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const tabs = await queryPowerAutomateTabs();

  const picked = pickBridgeTab(tabs, activeTab);

  if (!picked?.id) {
    return null;
  }

  try {
    return await chrome.tabs.get(picked.id);
  } catch {
    return null;
  }
}

async function waitForTabReady(tabId: number): Promise<void> {
  const deadline = Date.now() + TAB_READY_MAX_MS;
  while (Date.now() < deadline) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") {
        return;
      }
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

async function ensureContentBridgeOnTab(tabId: number): Promise<void> {
  await waitForTabReady(tabId);

  if (!chrome.scripting?.executeScript) {
    return;
  }

  try {
    await injectMainWorldHookOnTab(tabId);
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: ["content.js"],
      world: "ISOLATED",
    });
  } catch {
    /* page may not allow injection */
  }
  await new Promise((resolve) => setTimeout(resolve, BRIDGE_INJECT_SETTLE_MS));
}

function sendTabMessageOnce<T>(tabId: number, message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Content bridge timed out"));
    }, MESSAGE_TIMEOUT_MS);

    chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, (response) => {
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));

        return;
      }

      resolve(response as T);
    });
  });
}

async function sendTabMessage<T>(tabId: number, message: unknown): Promise<T> {
  return enqueueTabOperation(tabId, async () => {
    await ensureContentBridgeOnTab(tabId);
    try {
      return await sendTabMessageOnce<T>(tabId, message);
    } catch (error) {
      if (!isMissingContentScriptError(error)) {
        throw error;
      }
      await ensureContentBridgeOnTab(tabId);
      return sendTabMessageOnce<T>(tabId, message);
    }
  });
}

async function getSessionStatus(
  tabId: number,
  bridgeTabUrl: string | null,
): Promise<InspectorSessionStatusMessage> {
  const status = await sendTabMessage<InspectorSessionStatusMessage>(tabId, {
    type: INSPECTOR_MESSAGE.SESSION_STATUS,
  });
  return { ...status, connected: true, bridgeTabId: tabId, bridgeTabUrl };
}

async function resolveTokenFromTab(
  tabId: number,
  audience: InspectorAudience,
  url: string,
): Promise<string | null> {
  const response = await sendTabMessage<unknown>(tabId, {
    type: INSPECTOR_MESSAGE.RESOLVE_TOKEN,
    audience,
    url,
  });
  if (!isResolveTokenResponse(response)) {
    return null;
  }
  return response.token;
}

async function handleApiRequest(
  request: InspectorApiRequestMessage,
): Promise<InspectorApiResponseMessage> {
  const tab = await findBridgeTab();

  if (!tab?.id) {
    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId: request.requestId,
      ok: false,
      status: 503,
      body: null,
      error: "No Power Automate tab found. Open Power Automate to connect.",
    };
  }

  try {
    const proxied = canProxyApiToPortal(request.url, tab.url);

    let pageResult = (await fetchInspectorApiInPageMainWorld(tab.id, tab.url, request)) ?? null;

    if (!pageResult?.ok && proxied) {
      pageResult = await fetchInspectorApiViaPageSession(
        tab.id,
        tab.url,
        request,
        async (tabId, pageRequest) => {
          const response = await sendTabMessage<unknown>(tabId, {
            ...pageRequest,
            type: INSPECTOR_MESSAGE.PAGE_API_REQUEST,
          });
          if (!isPageApiResponse(response)) {
            return {
              type: INSPECTOR_MESSAGE.API_RESPONSE,
              requestId: pageRequest.requestId,
              ok: false,
              status: 0,
              body: null,
              error: "Invalid portal fetch response",
            };
          }
          return response;
        },
      );
    }

    if (pageResult?.ok) {
      return pageResult;
    }

    if (proxied) {
      return (
        pageResult ?? {
          type: INSPECTOR_MESSAGE.API_RESPONSE,
          requestId: request.requestId,
          ok: false,
          status: 503,
          body: null,
          error: "Portal session fetch failed. Reload the Power Automate tab and retry.",
        }
      );
    }

    return await fetchInspectorApiInBackground(tab.id, request, resolveTokenFromTab);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId: request.requestId,
      ok: false,
      status: 503,
      body: null,
      error: isMissingContentScriptError(error)
        ? "Power Automate tab is not connected to the extension. Reload that tab (F5), then try again."
        : message,
    };
  }
}

async function handleSessionStatus(): Promise<InspectorSessionStatusMessage> {
  const tab = await findBridgeTab();

  if (!tab?.id) {
    return {
      type: INSPECTOR_MESSAGE.SESSION_STATUS,

      connected: false,

      bridgeTabId: null,

      hasToken: false,

      message: "No Power Automate tab open",
    };
  }

  try {
    return await getSessionStatus(tab.id, tab.url ?? null);
  } catch {
    return {
      type: INSPECTOR_MESSAGE.SESSION_STATUS,

      connected: false,

      bridgeTabId: tab.id,

      hasToken: false,

      message:
        "Could not reach this Power Automate tab. Reload the tab (F5), or close and reopen it, then try again.",
    };
  }
}

async function handleOpenConnectTab(): Promise<{ tabId: number }> {
  const existing = await findBridgeTab();

  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true });

    await ensureContentBridgeOnTab(existing.id);

    return { tabId: existing.id };
  }

  const created = await chrome.tabs.create({ url: CONNECT_URL, active: true });

  const tabId = created.id ?? -1;

  if (tabId > 0) {
    await ensureContentBridgeOnTab(tabId);
  }

  return { tabId };
}

async function handleGetTabContext(): Promise<InspectorTabContextMessage> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const url = activeTab?.url ?? null;

  if (!url) {
    return {
      type: INSPECTOR_MESSAGE.GET_TAB_CONTEXT,

      environmentId: null,

      solutionId: null,

      flowId: null,

      runId: null,

      url: null,
    };
  }

  const ctx = parsePowerAutomateTabContext(url);

  return {
    type: INSPECTOR_MESSAGE.GET_TAB_CONTEXT,

    ...ctx,
  };
}

/** Register service-worker message listener for the Flow Inspector. */

export function installInspectorRouter(): void {
  void injectContentIntoPowerAutomateTabs();

  chrome.runtime.onInstalled.addListener(() => {
    void injectContentIntoPowerAutomateTabs();
  });

  chrome.runtime.onStartup?.addListener(() => {
    void injectContentIntoPowerAutomateTabs();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const typed = message as { type?: string };

    if (typed.type === INSPECTOR_MESSAGE.SESSION_STATUS) {
      void handleSessionStatus().then(sendResponse);

      return true;
    }

    if (isInspectorApiRequest(message)) {
      void handleApiRequest(message).then(sendResponse);

      return true;
    }

    if (typed.type === INSPECTOR_MESSAGE.OPEN_CONNECT_TAB) {
      void handleOpenConnectTab().then(sendResponse);

      return true;
    }

    if (typed.type === INSPECTOR_MESSAGE.GET_TAB_CONTEXT) {
      void handleGetTabContext().then(sendResponse);

      return true;
    }

    if (typed.type === INSPECTOR_MESSAGE.SYNC_FROM_ACTIVE_TAB) {
      void handleGetTabContext().then(sendResponse);

      return true;
    }

    return false;
  });
}

export { createRequestId };
