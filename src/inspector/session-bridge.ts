/** Message protocol between inspector UI, service worker, and Power Automate content bridge. */

export const INSPECTOR_MESSAGE = {
  SESSION_STATUS: "INSPECTOR_SESSION_STATUS",
  API_REQUEST: "INSPECTOR_API_REQUEST",
  /** Same shape as API_REQUEST; executed in the portal tab with credentials (no Bearer). */
  PAGE_API_REQUEST: "INSPECTOR_PAGE_API_REQUEST",
  API_RESPONSE: "INSPECTOR_API_RESPONSE",
  OPEN_CONNECT_TAB: "INSPECTOR_OPEN_CONNECT_TAB",
  GET_TAB_CONTEXT: "INSPECTOR_GET_TAB_CONTEXT",
  SYNC_FROM_ACTIVE_TAB: "INSPECTOR_SYNC_FROM_ACTIVE_TAB",
  RESOLVE_TOKEN: "INSPECTOR_RESOLVE_TOKEN",
} as const;

export type InspectorAudience = "powerplatform" | "powerapps" | "flow" | "any";

export type InspectorApiRequestMessage = {
  type: typeof INSPECTOR_MESSAGE.API_REQUEST;
  requestId: string;
  url: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  audience?: InspectorAudience;
};

export type InspectorApiResponseMessage = {
  type: typeof INSPECTOR_MESSAGE.API_RESPONSE;
  requestId: string;
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
};

export type InspectorSessionDebugInfo = {
  pageUrl: string;
  bridgeInstalled: boolean;
  msalSessionAccessTokenKeys: number;
  msalLocalAccessTokenKeys: number;
  cachedAudiences: string[];
  msalLocalKeysWithSecret?: number;
  msalLocalKeysExpired?: number;
  msalLocalKeysParseFailed?: number;
  msalLocalKeysNoSecret?: number;
  msalTokenKeyRefsResolved?: number;
  msalJwtHarvested?: number;
  indexedDbDatabasesScanned?: number;
  indexedDbEntriesScanned?: number;
  xhrInterceptorInstalled?: boolean;
  inIframe?: boolean;
  mainWorldListenerInstalled?: boolean;
  mainWorldHookPong?: boolean;
  mainWorldTokensCaptured?: number;
};

export type InspectorSessionStatusMessage = {
  type: typeof INSPECTOR_MESSAGE.SESSION_STATUS;
  connected: boolean;
  bridgeTabId: number | null;
  bridgeTabUrl?: string | null;
  hasToken: boolean;
  message?: string;
  debug?: InspectorSessionDebugInfo;
};

export type InspectorTabContextMessage = {
  type: typeof INSPECTOR_MESSAGE.GET_TAB_CONTEXT;
  environmentId: string | null;
  solutionId?: string | null;
  flowId: string | null;
  runId: string | null;
  url: string | null;
};

export type InspectorOpenConnectTabMessage = {
  type: typeof INSPECTOR_MESSAGE.OPEN_CONNECT_TAB;
};

export type InspectorSyncFromActiveTabMessage = {
  type: typeof INSPECTOR_MESSAGE.SYNC_FROM_ACTIVE_TAB;
};

export type InspectorResolveTokenMessage = {
  type: typeof INSPECTOR_MESSAGE.RESOLVE_TOKEN;
  audience?: InspectorAudience;
  /** API URL being called — used to pick a host- or audience-matching token. */
  url?: string;
};

export type InspectorResolveTokenResponse = {
  type: typeof INSPECTOR_MESSAGE.RESOLVE_TOKEN;
  token: string | null;
  audience: InspectorAudience;
};

export type InspectorOutboundMessage =
  | InspectorApiRequestMessage
  | { type: typeof INSPECTOR_MESSAGE.SESSION_STATUS }
  | InspectorOpenConnectTabMessage
  | { type: typeof INSPECTOR_MESSAGE.GET_TAB_CONTEXT }
  | InspectorSyncFromActiveTabMessage
  | InspectorResolveTokenMessage;

export type InspectorInboundMessage =
  | InspectorApiResponseMessage
  | InspectorSessionStatusMessage
  | InspectorTabContextMessage
  | InspectorResolveTokenResponse;

export function isInspectorApiRequest(message: unknown): message is InspectorApiRequestMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as InspectorApiRequestMessage).type === INSPECTOR_MESSAGE.API_REQUEST &&
    typeof (message as InspectorApiRequestMessage).requestId === "string" &&
    typeof (message as InspectorApiRequestMessage).url === "string"
  );
}

export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
