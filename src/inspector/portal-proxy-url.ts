/**
 * Map public Power Platform API URLs to same-origin paths on the Power Automate portal.
 * Fetches from the content script use the portal session (cookies) instead of extension-held tokens.
 */

const PROXY_HOSTS = new Set([
  "api.bap.microsoft.com",
  "api.flow.microsoft.com",
  "api.powerplatform.com",
]);

export function toPortalProxyUrl(apiUrl: string, portalOrigin: string): string | null {
  let parsed: URL;
  let origin: URL;
  try {
    parsed = new URL(apiUrl);
    origin = new URL(portalOrigin);
  } catch {
    return null;
  }

  if (!PROXY_HOSTS.has(parsed.hostname.toLowerCase())) {
    if (parsed.origin === origin.origin) {
      return apiUrl;
    }
    return null;
  }

  // powerplatform.com/cloudFlows and environmentmanagement are not mirrored on the portal path
  if (parsed.hostname.includes("api.powerplatform.com")) {
    const path = parsed.pathname.toLowerCase();
    if (path.includes("/powerautomate/") || path.includes("/environmentmanagement/")) {
      return null;
    }
  }

  return `${origin.origin}${parsed.pathname}${parsed.search}`;
}

/** Maker-portal paths that differ from the public API hostname layout. */
export function alternatePortalApiUrl(apiUrl: string, portalOrigin: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    return null;
  }

  const envFlows = parsed.pathname.match(
    /\/providers\/Microsoft\.ProcessSimple\/environments\/([^/]+)\/flows\/?$/i,
  );
  if (envFlows?.[1] && parsed.hostname.includes("flow.microsoft.com")) {
    return `${portalOrigin}/environments/${encodeURIComponent(envFlows[1])}/flows${parsed.search}`;
  }

  if (
    parsed.hostname.includes("api.bap.microsoft.com") &&
    parsed.pathname.includes("/providers/Microsoft.BusinessAppPlatform/environments")
  ) {
    return `${portalOrigin}/providers/Microsoft.BusinessAppPlatform/environments${parsed.search}`;
  }

  const flowRuns = parsed.pathname.match(
    /\/providers\/Microsoft\.ProcessSimple\/environments\/([^/]+)\/flows\/([^/]+)\/runs\/?$/i,
  );
  if (flowRuns?.[1] && flowRuns?.[2] && parsed.hostname.includes("flow.microsoft.com")) {
    return `${portalOrigin}/environments/${encodeURIComponent(flowRuns[1])}/flows/${encodeURIComponent(flowRuns[2])}/runs${parsed.search}`;
  }

  return null;
}

export function resolvePortalFetchUrl(apiUrl: string, portalOrigin: string): string | null {
  return toPortalProxyUrl(apiUrl, portalOrigin) ?? alternatePortalApiUrl(apiUrl, portalOrigin);
}

export function isPowerAutomatePortalOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith("powerautomate.com") || host === "flow.microsoft.com";
  } catch {
    return false;
  }
}
