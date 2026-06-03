/**
 * Perform inspector API calls from the service worker (no page CORS restrictions).
 * Tokens are resolved from the Power Automate content-script bridge tab.
 */
import {
  INSPECTOR_MESSAGE,
  type InspectorApiRequestMessage,
  type InspectorApiResponseMessage,
  type InspectorAudience,
  type InspectorResolveTokenResponse,
} from "../inspector/session-bridge";

const POWER_PLATFORM_HOST = "api.powerplatform.com";
const BAP_API_HOST = "api.bap.microsoft.com";
const FLOW_API_HOST = "api.flow.microsoft.com";

export function audienceForApiUrl(urlValue: string): InspectorAudience {
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
  return "powerplatform";
}

function formatApiError(status: number, body: unknown): string {
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
    (typeof body === "string" && body.length > 0 && body.length < 200 ? body : null);
  return message ? `HTTP ${status}: ${message}` : `HTTP ${status}`;
}

export async function fetchInspectorApiInBackground(
  tabId: number,
  request: InspectorApiRequestMessage,
  resolveTokenFromTab: (
    tabId: number,
    audience: InspectorAudience,
    url: string,
  ) => Promise<string | null>,
): Promise<InspectorApiResponseMessage> {
  const { requestId, url, method = "GET", body, headers: extraHeaders } = request;
  const audience = request.audience ?? audienceForApiUrl(url);

  const token = await resolveTokenFromTab(tabId, audience, url);
  if (!token) {
    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId,
      ok: false,
      status: 401,
      body: null,
      error:
        "No matching API token for this host. Refresh the Power Automate tab, open Run history, then retry.",
    };
  }

  const headers = new Headers(extraHeaders ?? {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  try {
    const response = await fetch(url, { method, headers, body });
    const text = await response.text();
    let parsedBody: unknown = text;
    if (text.length > 0) {
      try {
        parsedBody = JSON.parse(text) as unknown;
      } catch {
        parsedBody = text;
      }
    }

    return {
      type: INSPECTOR_MESSAGE.API_RESPONSE,
      requestId,
      ok: response.ok,
      status: response.status,
      body: parsedBody,
      error: response.ok ? undefined : formatApiError(response.status, parsedBody),
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

export function isResolveTokenResponse(value: unknown): value is InspectorResolveTokenResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as InspectorResolveTokenResponse).type === INSPECTOR_MESSAGE.RESOLVE_TOKEN &&
    "token" in (value as InspectorResolveTokenResponse) &&
    ((value as InspectorResolveTokenResponse).token === null ||
      typeof (value as InspectorResolveTokenResponse).token === "string")
  );
}
