/**
 * Portal API fetch via chrome.scripting.executeScript (MAIN world, session cookies).
 * Avoids fragile chrome.tabs.sendMessage port races for PAGE_API_REQUEST.
 */
import {
  INSPECTOR_MESSAGE,
  type InspectorApiRequestMessage,
  type InspectorApiResponseMessage,
} from "../inspector/session-bridge";
import { parseResponseBody, resolvePageFetchUrl } from "./inspector-page-fetch";

type PageScriptFetchPayload = {
  ok: boolean;
  status: number;
  bodyText: string;
  error?: string;
};

function formatPageFetchError(status: number, body: unknown, scriptError?: string): string {
  if (scriptError) {
    return scriptError;
  }
  const record =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const errorBlock = record?.error;
  const errorRec =
    typeof errorBlock === "object" && errorBlock !== null
      ? (errorBlock as Record<string, unknown>)
      : null;
  const message =
    (typeof errorRec?.message === "string" && errorRec.message) ||
    (typeof record?.message === "string" && record.message) ||
    (typeof body === "string" && body.length > 0 && body.length < 300 ? body : null);
  return message ? `HTTP ${status}: ${message}` : `HTTP ${status}`;
}

/** Runs inside the portal tab MAIN world — must stay self-contained. */
function portalFetchInPage(
  fetchUrl: string,
  fetchMethod: string,
  headerEntries: [string, string][],
): Promise<PageScriptFetchPayload> {
  const headers = new Headers();
  for (const [name, value] of headerEntries) {
    headers.set(name, value);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return fetch(fetchUrl, {
    method: fetchMethod,
    headers,
    credentials: "include",
  })
    .then(async (response) => ({
      ok: response.ok,
      status: response.status,
      bodyText: await response.text(),
    }))
    .catch((error: unknown) => ({
      ok: false,
      status: 0,
      bodyText: "",
      error: error instanceof Error ? error.message : String(error),
    }));
}

export function canProxyApiToPortal(apiUrl: string, tabUrl: string | undefined): boolean {
  return resolvePageFetchUrl(apiUrl, tabUrl) !== null;
}

export async function fetchInspectorApiInPageMainWorld(
  tabId: number,
  tabUrl: string | undefined,
  request: InspectorApiRequestMessage,
): Promise<InspectorApiResponseMessage | null> {
  const pageUrl = resolvePageFetchUrl(request.url, tabUrl);
  if (!pageUrl || !chrome.scripting?.executeScript) {
    return null;
  }

  const headerRecord: Record<string, string> = {
    Accept: "application/json",
    ...(request.headers ?? {}),
  };
  const headerEntries = Object.entries(headerRecord) as [string, string][];

  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      world: "MAIN",
      func: portalFetchInPage,
      args: [pageUrl, request.method ?? "GET", headerEntries],
    });

    const raw = injection?.result as PageScriptFetchPayload | undefined;
    if (!raw) {
      return {
        type: INSPECTOR_MESSAGE.API_RESPONSE,
        requestId: request.requestId,
        ok: false,
        status: 0,
        body: null,
        error: "Portal fetch returned no result",
      };
    }

    const body = parseResponseBody(raw.bodyText);
    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId: request.requestId,
      ok: raw.ok,
      status: raw.status,
      body,
      error: raw.ok ? undefined : formatPageFetchError(raw.status, body, raw.error),
    };
  } catch {
    return null;
  }
}
