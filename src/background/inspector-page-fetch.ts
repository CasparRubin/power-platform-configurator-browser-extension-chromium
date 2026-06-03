/**
 * Perform inspector API calls from the Power Automate content script using the portal session.
 */
import {
  INSPECTOR_MESSAGE,
  type InspectorApiRequestMessage,
  type InspectorApiResponseMessage,
} from "../inspector/session-bridge";
import { isPowerAutomatePortalOrigin, resolvePortalFetchUrl } from "../inspector/portal-proxy-url";

function parseResponseBody(text: string): unknown {
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function resolvePageFetchUrl(apiUrl: string, tabUrl: string | undefined): string | null {
  if (!tabUrl) {
    return null;
  }
  let portalOrigin: string;
  try {
    portalOrigin = new URL(tabUrl).origin;
  } catch {
    return null;
  }
  if (!isPowerAutomatePortalOrigin(portalOrigin)) {
    return null;
  }
  return resolvePortalFetchUrl(apiUrl, portalOrigin);
}

export type PageFetchSender = (
  tabId: number,
  request: InspectorApiRequestMessage & { url: string },
) => Promise<InspectorApiResponseMessage>;

export async function fetchInspectorApiViaPageSession(
  tabId: number,
  tabUrl: string | undefined,
  request: InspectorApiRequestMessage,
  sendPageFetch: PageFetchSender,
): Promise<InspectorApiResponseMessage | null> {
  const pageUrl = resolvePageFetchUrl(request.url, tabUrl);
  if (!pageUrl) {
    return null;
  }

  return sendPageFetch(tabId, { ...request, url: pageUrl });
}

export function isPageApiResponse(value: unknown): value is InspectorApiResponseMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as InspectorApiResponseMessage).type === INSPECTOR_MESSAGE.API_RESPONSE &&
    typeof (value as InspectorApiResponseMessage).requestId === "string"
  );
}

export function pageFetchWorthRetry(apiResponse: InspectorApiResponseMessage): boolean {
  return apiResponse.status === 0 || apiResponse.status === 401 || apiResponse.status === 403;
}

export { parseResponseBody };
