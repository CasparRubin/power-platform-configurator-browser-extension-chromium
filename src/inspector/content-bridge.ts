/**
 * Content-script session bridge: captures portal Bearer tokens and proxies API requests
 * using the user's existing Power Automate session (no extension OAuth).
 */
import {
  INSPECTOR_MESSAGE,
  type InspectorApiRequestMessage,
  type InspectorApiResponseMessage,
  type InspectorAudience,
  type InspectorSessionDebugInfo,
  type InspectorSessionStatusMessage,
} from "./session-bridge";
import { scanIndexedDbMsal } from "./msal-indexeddb-scan";
import { type MsalScanResult, scanMsalStorage } from "./msal-token-scan";
import {
  getMainWorldDiagnostics,
  installMainWorldTokenListener,
  pingMainWorldHook,
} from "./main-world-token-listener";
import { installXhrInterceptor, isXhrInterceptorInstalled } from "./network-token-capture";
import { nudgePortalAuthViaMainWorld } from "./portal-auth-nudge";
import { fetchViaMainWorld } from "./main-world-fetch";
import { jwtAudiencesFromToken, jwtMatchesApiUrl } from "./token-match";
import { isInspectorApiRequest } from "./session-bridge";

type CachedToken = {
  token: string;
  expiresAt: number;
};

const TOKEN_TTL_MS = 55 * 60 * 1000;
const tokenByAudience = new Map<string, CachedToken>();
let lastLocalMsalScan: MsalScanResult | null = null;
let lastIndexedDbMeta = { databasesScanned: 0, entriesScanned: 0 };
let fetchInterceptorInstalled = false;

function storeTokenFromNetwork(urlValue: string, bearer: string): void {
  const aud = audienceForUrl(urlValue);
  storeToken(aud, bearer);
  for (const jwtAud of jwtAudiencesFromToken(bearer)) {
    storeToken(jwtAud, bearer);
  }
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    storeToken(hostCacheKey(host), bearer);
  } catch {
    /* ignore */
  }
  if (aud !== "any") {
    storeToken("any", bearer);
  }
}

function storeTokenFromMsal(
  audience: "flow" | "powerplatform" | "powerapps" | "any",
  token: string,
): void {
  storeToken(audience, token);
}

function scanMsalSessionStorage(): void {
  scanMsalStorage(sessionStorage, storeTokenFromMsal);
  lastLocalMsalScan = scanMsalStorage(localStorage, storeTokenFromMsal);
}

function mergeMsalScan(into: MsalScanResult, from: MsalScanResult): void {
  into.tokensFound += from.tokensFound;
  into.keysWithSecret += from.keysWithSecret;
  into.tokenKeyRefsResolved += from.tokenKeyRefsResolved;
  into.jwtHarvested += from.jwtHarvested;
}

async function refreshAllTokenSources(): Promise<void> {
  scanMsalSessionStorage();
  const idb = await Promise.race([
    scanIndexedDbMsal(storeTokenFromMsal),
    new Promise<Awaited<ReturnType<typeof scanIndexedDbMsal>>>((resolve) =>
      setTimeout(
        () =>
          resolve({
            tokensFound: 0,
            accessTokenKeyCount: 0,
            msalKeyCount: 0,
            keysWithSecret: 0,
            keysNoSecret: 0,
            keysExpired: 0,
            keysParseFailed: 0,
            tokenKeyRefsResolved: 0,
            jwtHarvested: 0,
            databasesScanned: 0,
            entriesScanned: 0,
          }),
        2_000,
      ),
    ),
  ]);

  lastIndexedDbMeta = {
    databasesScanned: idb.databasesScanned,
    entriesScanned: idb.entriesScanned,
  };
  if (lastLocalMsalScan) {
    mergeMsalScan(lastLocalMsalScan, idb);
  } else {
    lastLocalMsalScan = idb;
  }

  if (!getStoredToken("any")) {
    pingMainWorldHook();
    nudgePortalAuthViaMainWorld();
    await new Promise((resolve) => setTimeout(resolve, 400));
    pingMainWorldHook();
    scanMsalSessionStorage();
  }
}

const POWER_PLATFORM_HOST = "api.powerplatform.com";
const BAP_API_HOST = "api.bap.microsoft.com";
const FLOW_API_HOST = "api.flow.microsoft.com";

function hostCacheKey(host: string): string {
  return `host:${host}`;
}

function audienceKey(audience: string): string {
  return audience;
}

function storeToken(audience: string, token: string): void {
  tokenByAudience.set(audienceKey(audience), {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
}

function getStoredToken(audience: string): string | null {
  const cached = tokenByAudience.get(audienceKey(audience));
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    tokenByAudience.delete(audienceKey(audience));
    return null;
  }
  return cached.token;
}

function audienceForUrl(urlValue: string): InspectorAudience {
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    if (host.includes(FLOW_API_HOST)) {
      return "flow";
    }
    if (host.includes(BAP_API_HOST)) {
      return "powerapps";
    }
    if (host.includes(POWER_PLATFORM_HOST)) {
      return "powerplatform";
    }
  } catch {
    /* ignore */
  }
  return "any";
}

function extractBearerFromHeaders(headers: HeadersInit | undefined): string | null {
  if (!headers) {
    return null;
  }
  const normalized = new Headers(headers);
  const auth = normalized.get("Authorization") ?? normalized.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

function installFetchInterceptor(): void {
  if (fetchInterceptorInstalled) {
    return;
  }
  fetchInterceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function inspectorFetchInterceptor(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urlValue =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const bearer = extractBearerFromHeaders(init?.headers);
    if (bearer) {
      storeTokenFromNetwork(urlValue, bearer);
    }
    const response = await originalFetch(input, init);
    try {
      const responseAuth = response.headers.get("Authorization");
      if (responseAuth?.startsWith("Bearer ")) {
        storeTokenFromNetwork(urlValue, responseAuth.slice(7));
      }
    } catch {
      /* ignore */
    }
    return response;
  };
}

function audienceResolveOrder(audience: InspectorAudience): InspectorAudience[] {
  switch (audience) {
    case "flow":
      return ["flow", "any", "powerapps", "powerplatform"];
    case "powerapps":
      return ["powerapps", "powerplatform", "any", "flow"];
    case "powerplatform":
      return ["powerplatform", "powerapps", "any", "flow"];
    default:
      return ["any", "powerapps", "powerplatform", "flow"];
  }
}

function resolveTokenForAudience(audience: InspectorAudience, url?: string): string | null {
  scanMsalSessionStorage();

  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      const hostToken = getStoredToken(hostCacheKey(host));
      if (hostToken && jwtMatchesApiUrl(hostToken, url)) {
        return hostToken;
      }
    } catch {
      /* ignore */
    }

    for (const aud of audienceResolveOrder(audience)) {
      const token = getStoredToken(aud);
      if (token && jwtMatchesApiUrl(token, url)) {
        return token;
      }
    }
    return null;
  }

  for (const aud of audienceResolveOrder(audience)) {
    const token = getStoredToken(aud);
    if (token) {
      return token;
    }
  }
  return null;
}

async function fetchViaPortalSession(
  request: InspectorApiRequestMessage,
): Promise<InspectorApiResponseMessage> {
  const { requestId, url, method = "GET", body, headers: extraHeaders } = request;
  const headerRecord: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (!headerRecord.Accept && !headerRecord.accept) {
    headerRecord.Accept = "application/json";
  }

  try {
    let text: string;
    let status: number;
    let ok: boolean;

    if (window.top === window) {
      const mw = await fetchViaMainWorld(url, { method, headers: headerRecord });
      text = mw.bodyText ?? "";
      status = mw.status;
      ok = mw.ok;
      if (!ok && mw.error) {
        return {
          type: INSPECTOR_MESSAGE.API_RESPONSE,
          requestId,
          ok: false,
          status,
          body: null,
          error: mw.error,
        };
      }
    } else {
      const response = await fetch(url, {
        method,
        headers: headerRecord,
        body,
        credentials: "include",
      });
      text = await response.text();
      status = response.status;
      ok = response.ok;
    }
    let parsedBody: unknown = text;
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown;
      } catch {
        parsedBody = text;
      }
    }
    const record =
      typeof parsedBody === "object" && parsedBody !== null
        ? (parsedBody as Record<string, unknown>)
        : null;
    const errorBlock = record?.error;
    const errorRec =
      typeof errorBlock === "object" && errorBlock !== null
        ? (errorBlock as Record<string, unknown>)
        : null;
    const detail =
      (typeof errorRec?.message === "string" && errorRec.message) ||
      (typeof record?.message === "string" && record.message) ||
      undefined;

    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId,
      ok,
      status,
      body: parsedBody,
      error: ok ? undefined : detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId,
      ok: false,
      status: 0,
      body: null,
      error: message,
    };
  }
}

function countMsalAccessTokenKeys(storage: Storage): number {
  let count = 0;
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.toLowerCase().includes("accesstoken")) {
        count += 1;
      }
    }
  } catch {
    return 0;
  }
  return count;
}

function cachedAudienceNames(): string[] {
  const names: string[] = [];
  for (const aud of ["any", "powerapps", "powerplatform", "flow"] as const) {
    if (getStoredToken(aud)) {
      names.push(aud);
    }
  }
  return names;
}

function collectSessionDebug(): InspectorSessionDebugInfo {
  const local = lastLocalMsalScan;
  const mw = getMainWorldDiagnostics();
  return {
    pageUrl: location.href,
    bridgeInstalled,
    msalSessionAccessTokenKeys: countMsalAccessTokenKeys(sessionStorage),
    msalLocalAccessTokenKeys: local?.accessTokenKeyCount ?? countMsalAccessTokenKeys(localStorage),
    cachedAudiences: cachedAudienceNames(),
    msalLocalKeysWithSecret: local?.keysWithSecret ?? 0,
    msalLocalKeysExpired: local?.keysExpired ?? 0,
    msalLocalKeysParseFailed: local?.keysParseFailed ?? 0,
    msalLocalKeysNoSecret: local?.keysNoSecret ?? 0,
    msalTokenKeyRefsResolved: local?.tokenKeyRefsResolved ?? 0,
    msalJwtHarvested: local?.jwtHarvested ?? 0,
    indexedDbDatabasesScanned: lastIndexedDbMeta.databasesScanned,
    indexedDbEntriesScanned: lastIndexedDbMeta.entriesScanned,
    xhrInterceptorInstalled: isXhrInterceptorInstalled(),
    inIframe: window.top !== window,
    mainWorldListenerInstalled: mw.listenerInstalled,
    mainWorldHookPong: mw.pongReceived,
    mainWorldTokensCaptured: mw.tokensCaptured,
  };
}

function sessionStatus(): InspectorSessionStatusMessage {
  const hasToken =
    Boolean(getStoredToken("any")) ||
    Boolean(getStoredToken("powerapps")) ||
    Boolean(getStoredToken("powerplatform")) ||
    Boolean(getStoredToken("flow"));
  const debug = collectSessionDebug();
  const hasMsalKeys = debug.msalSessionAccessTokenKeys + debug.msalLocalAccessTokenKeys > 0;
  return {
    type: INSPECTOR_MESSAGE.SESSION_STATUS,
    connected: true,
    bridgeTabId: null,
    hasToken,
    message: hasToken
      ? "Session bridge active"
      : debug.mainWorldHookPong !== true
        ? "Page token hook not active — reload the Power Automate tab (F5) after updating the extension"
        : debug.mainWorldTokensCaptured === 0
          ? "Interact with the flow page (open Run history, refresh) so Power Automate calls its API"
          : (debug.msalLocalKeysWithSecret ?? 0) > 0
            ? "MSAL entries found but token not cached yet — retry refresh"
            : hasMsalKeys
              ? "MSAL cache is encrypted — waiting for API traffic on this tab"
              : "Waiting for Power Automate API activity or sign-in on this tab",
    debug,
  };
}

async function sessionStatusAsync(): Promise<InspectorSessionStatusMessage> {
  await refreshAllTokenSources();
  return sessionStatus();
}

/** Register chrome.runtime message handlers for the session bridge. */
let bridgeInstalled = false;
let bridgeRouterInstalled = false;

function installTokenCapture(): void {
  installFetchInterceptor();
  installXhrInterceptor(storeTokenFromNetwork);
  installMainWorldTokenListener(storeTokenFromNetwork);
  void refreshAllTokenSources();
}

export function installContentBridge(): void {
  if (!bridgeInstalled) {
    bridgeInstalled = true;
    installTokenCapture();
  }

  if (bridgeRouterInstalled || window.top !== window) {
    return;
  }
  bridgeRouterInstalled = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const typed = message as { type?: string };

    if (typed.type === INSPECTOR_MESSAGE.SESSION_STATUS) {
      void sessionStatusAsync().then(sendResponse);
      return true;
    }

    if (typed.type === INSPECTOR_MESSAGE.PAGE_API_REQUEST && isInspectorApiRequest(message)) {
      void fetchViaPortalSession(message).then(sendResponse);
      return true;
    }

    if (typed.type === INSPECTOR_MESSAGE.RESOLVE_TOKEN) {
      const resolveMsg = message as {
        audience?: InspectorAudience;
        url?: string;
      };
      const audience = resolveMsg.audience ?? "powerplatform";
      sendResponse({
        type: INSPECTOR_MESSAGE.RESOLVE_TOKEN,
        token: resolveTokenForAudience(audience, resolveMsg.url),
        audience,
      });
      return false;
    }

    return false;
  });
}
