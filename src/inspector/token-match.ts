/**
 * Pick access tokens whose JWT audience matches the API host being called.
 */
import type { InspectorAudience } from "./session-bridge";

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const segment = jwt.split(".")[1];
    if (!segment) {
      return null;
    }
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jwtAudienceText(payload: Record<string, unknown>): string {
  const audValue = payload.aud;
  if (typeof audValue === "string") {
    return audValue.toLowerCase();
  }
  if (Array.isArray(audValue)) {
    return audValue
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .toLowerCase();
  }
  return "";
}

/** Resource identifiers expected for a given API URL host. */
export function expectedResourcesForApiUrl(urlValue: string): string[] {
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    if (host.includes("api.bap.microsoft.com")) {
      return ["service.powerapps.com", "api.bap.microsoft.com", "powerapps"];
    }
    if (host.includes("api.flow.microsoft.com")) {
      return [
        "service.flow.microsoft.com",
        "api.flow.microsoft.com",
        "processsimple",
        "flow.microsoft",
      ];
    }
    if (host.includes("api.powerplatform.com")) {
      return ["api.powerplatform.com", "powerplatform", "powerapps"];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function jwtAudiencesFromToken(jwt: string): InspectorAudience[] {
  const payload = decodeJwtPayload(jwt);
  if (!payload) {
    return ["any"];
  }
  const audText = jwtAudienceText(payload);
  const audiences: InspectorAudience[] = [];
  if (
    audText.includes("service.flow.microsoft.com") ||
    audText.includes("api.flow.microsoft.com")
  ) {
    audiences.push("flow");
  }
  if (audText.includes("service.powerapps.com") || audText.includes("api.bap.microsoft.com")) {
    audiences.push("powerapps");
  }
  if (audText.includes("api.powerplatform.com") || audText.includes("powerplatform")) {
    audiences.push("powerplatform");
  }
  if (audiences.length === 0) {
    audiences.push("any");
  }
  return audiences;
}

export function jwtMatchesApiUrl(jwt: string, urlValue: string): boolean {
  const expected = expectedResourcesForApiUrl(urlValue);
  if (expected.length === 0) {
    return true;
  }
  const payload = decodeJwtPayload(jwt);
  if (!payload) {
    return false;
  }
  const audText = jwtAudienceText(payload);
  if (!audText) {
    return false;
  }

  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    if (host.includes("api.bap.microsoft.com")) {
      if (audText.includes("api.powerplatform.com") && !audText.includes("service.powerapps.com")) {
        return false;
      }
    }
    if (host.includes("api.flow.microsoft.com")) {
      if (
        audText.includes("api.powerplatform.com") &&
        !audText.includes("service.flow.microsoft.com")
      ) {
        return false;
      }
    }
  } catch {
    /* ignore */
  }

  return expected.some((fragment) => audText.includes(fragment));
}
