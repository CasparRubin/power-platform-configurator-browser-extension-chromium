/**
 * Extract Bearer tokens from MSAL browser cache entries (sessionStorage / localStorage).
 * Power Automate often keeps access tokens in localStorage with varied JSON shapes.
 */

export type MsalScanResult = {
  tokensFound: number;
  accessTokenKeyCount: number;
  msalKeyCount: number;
  keysWithSecret: number;
  keysNoSecret: number;
  keysExpired: number;
  keysParseFailed: number;
  tokenKeyRefsResolved: number;
  jwtHarvested: number;
};

export type MsalTokenHit = {
  token: string;
  target: string;
};

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

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

export function isLikelyApiAccessToken(jwt: string, keyHint: string): boolean {
  const lower = keyHint.toLowerCase();
  if (lower.includes("idtoken") || lower.includes("refreshtoken")) {
    return false;
  }

  const payload = decodeJwtPayload(jwt);
  if (!payload) {
    return lower.includes("accesstoken");
  }

  if (typeof payload.scp === "string" && payload.scp.length > 0) {
    return true;
  }
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    return true;
  }

  const audValue = payload.aud;
  const audText =
    typeof audValue === "string"
      ? audValue
      : Array.isArray(audValue)
        ? audValue.filter((v): v is string => typeof v === "string").join(" ")
        : "";

  if (
    audText.includes("powerplatform") ||
    audText.includes("flow.microsoft") ||
    audText.includes("service.flow") ||
    audText.includes("powerapps") ||
    audText.includes("dynamics.com")
  ) {
    return true;
  }

  if (payload.idtyp === "user" && !payload.scp) {
    return false;
  }

  return lower.includes("accesstoken");
}

function storeHits(
  hits: MsalTokenHit[],
  onToken: (audience: "flow" | "powerplatform" | "powerapps" | "any", token: string) => void,
  result: MsalScanResult,
): void {
  if (hits.length === 0) {
    return;
  }
  result.keysWithSecret += 1;
  for (const hit of hits) {
    for (const aud of audienceFromMsalTarget(hit.target)) {
      onToken(aud, hit.token);
    }
    result.tokensFound += 1;
  }
}

function resolveReferencedStorageKeys(
  storage: Storage,
  raw: string,
  result: MsalScanResult,
  onToken: (audience: "flow" | "powerplatform" | "powerapps" | "any", token: string) => void,
): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return false;
  }

  if (!Array.isArray(parsed)) {
    return false;
  }

  let resolved = false;
  for (const item of parsed) {
    if (typeof item !== "string" || item.length === 0) {
      continue;
    }
    const refRaw = storage.getItem(item);
    if (!refRaw) {
      continue;
    }
    const refHits = extractHitsFromRaw(refRaw, item).hits.filter((hit) =>
      isLikelyApiAccessToken(hit.token, item),
    );
    if (refHits.length > 0) {
      resolved = true;
      result.tokenKeyRefsResolved += 1;
      storeHits(refHits, onToken, result);
    }
  }
  return resolved;
}

export function harvestJwtsFromStorage(
  storage: Storage,
  onToken: (audience: "flow" | "powerplatform" | "powerapps" | "any", token: string) => void,
): number {
  let harvested = 0;
  const seen = new Set<string>();

  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) {
        continue;
      }
      const raw = storage.getItem(key);
      if (!raw || !raw.includes("eyJ")) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (isExpiredCredential(parsed)) {
          continue;
        }
      } catch {
        /* not JSON — still try regex harvest */
      }

      const matches = raw.match(JWT_PATTERN) ?? [];
      for (const jwt of matches) {
        if (seen.has(jwt) || !isLikelyApiAccessToken(jwt, key)) {
          continue;
        }
        seen.add(jwt);
        const target = targetFromKeyHint(key);
        for (const aud of audienceFromMsalTarget(target)) {
          onToken(aud, jwt);
        }
        harvested += 1;
      }
    }
  } catch {
    /* storage blocked */
  }

  return harvested;
}

function looksLikeJwt(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 40 && trimmed.split(".").length === 3 && trimmed.startsWith("ey");
}

function isAccessTokenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes("idtoken") || lower.includes("refreshtoken")) {
    return false;
  }
  return lower.includes("accesstoken") || lower.includes("access-token");
}

function isMsalStorageKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes("msal") || isAccessTokenKey(key);
}

function parseExpiresOnMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.length > 0) {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) {
      return asNum < 1e12 ? asNum * 1000 : asNum;
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isExpiredCredential(record: Record<string, unknown>): boolean {
  const expiresOn = parseExpiresOnMs(
    record.expiresOn ?? record.extendedExpiresOn ?? record.expires_on,
  );
  if (expiresOn === null) {
    return false;
  }
  return expiresOn <= Date.now();
}

function targetFromKeyHint(key: string): string {
  const lower = key.toLowerCase();
  if (
    lower.includes("powerplatform") ||
    lower.includes("powerapps") ||
    lower.includes("dynamics")
  ) {
    return "https://api.powerplatform.com/";
  }
  if (lower.includes("flow.microsoft") || lower.includes("service.flow")) {
    return "https://api.flow.microsoft.com/";
  }
  return key;
}

function readTokenFields(record: Record<string, unknown>): string | null {
  const candidates = [
    record.secret,
    record.accessToken,
    record.access_token,
    record.token,
    record.idToken,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && looksLikeJwt(candidate)) {
      return candidate;
    }
  }
  return null;
}

function extractHitsFromRecord(record: Record<string, unknown>, keyHint: string): MsalTokenHit[] {
  if (isExpiredCredential(record)) {
    return [];
  }

  const credentialType = String(
    record.credentialType ?? record.credential_type ?? "",
  ).toLowerCase();
  if (
    credentialType &&
    (credentialType.includes("idtoken") ||
      credentialType.includes("refreshtoken") ||
      (!credentialType.includes("accesstoken") && !credentialType.includes("access_token")))
  ) {
    return [];
  }

  const token = readTokenFields(record);
  if (!token) {
    return [];
  }

  const target = String(
    record.target ?? record.scope ?? record.resource ?? targetFromKeyHint(keyHint),
  );
  return [{ token, target }];
}

function extractHitsFromUnknown(parsed: unknown, keyHint: string): MsalTokenHit[] {
  if (typeof parsed === "string") {
    if (looksLikeJwt(parsed)) {
      return [{ token: parsed, target: targetFromKeyHint(keyHint) }];
    }
    try {
      return extractHitsFromUnknown(JSON.parse(parsed) as unknown, keyHint);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => extractHitsFromUnknown(item, keyHint));
  }

  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const direct = extractHitsFromRecord(record, keyHint);
  if (direct.length > 0) {
    return direct;
  }

  const nestedHits: MsalTokenHit[] = [];
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      nestedHits.push(...extractHitsFromUnknown(value, keyHint));
    }
  }
  return nestedHits;
}

function extractHitsFromRaw(
  raw: string,
  keyHint: string,
): { hits: MsalTokenHit[]; parseFailed: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { hits: [], parseFailed: true };
  }

  if (looksLikeJwt(trimmed)) {
    return { hits: [{ token: trimmed, target: targetFromKeyHint(keyHint) }], parseFailed: false };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return { hits: extractHitsFromUnknown(parsed, keyHint), parseFailed: false };
  } catch {
    const jwtMatch = trimmed.match(
      /"(?:secret|accessToken|access_token|token)"\s*:\s*"(eyJ[^"]+)"/i,
    );
    if (jwtMatch?.[1] && looksLikeJwt(jwtMatch[1])) {
      return {
        hits: [{ token: jwtMatch[1], target: targetFromKeyHint(keyHint) }],
        parseFailed: false,
      };
    }
    return { hits: [], parseFailed: true };
  }
}

export function audienceFromMsalTarget(
  target: string,
): ("flow" | "powerplatform" | "powerapps" | "any")[] {
  const lower = target.toLowerCase();
  const audiences: ("flow" | "powerplatform" | "powerapps" | "any")[] = [];
  if (
    lower.includes("flow.microsoft") ||
    lower.includes("service.flow") ||
    lower.includes("processsimple")
  ) {
    audiences.push("flow");
  }
  if (
    lower.includes("service.powerapps") ||
    lower.includes("api.bap.microsoft") ||
    (lower.includes("powerapps") && !lower.includes("powerplatform"))
  ) {
    audiences.push("powerapps");
  }
  if (
    lower.includes("powerplatform") ||
    lower.includes("powerapps") ||
    lower.includes("dynamics.com") ||
    lower.includes("microsoft.com/common")
  ) {
    audiences.push("powerplatform");
  }
  audiences.push("any");
  return audiences;
}

export function scanMsalStorage(
  storage: Storage,
  onToken: (audience: "flow" | "powerplatform" | "powerapps" | "any", token: string) => void,
): MsalScanResult {
  const result: MsalScanResult = {
    tokensFound: 0,
    accessTokenKeyCount: 0,
    msalKeyCount: 0,
    keysWithSecret: 0,
    keysNoSecret: 0,
    keysExpired: 0,
    keysParseFailed: 0,
    tokenKeyRefsResolved: 0,
    jwtHarvested: 0,
  };

  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || !isMsalStorageKey(key)) {
        continue;
      }
      result.msalKeyCount += 1;
      if (isAccessTokenKey(key)) {
        result.accessTokenKeyCount += 1;
      }

      const raw = storage.getItem(key);
      if (!raw) {
        result.keysParseFailed += 1;
        continue;
      }

      const { hits, parseFailed } = extractHitsFromRaw(raw, key);
      const usableHits = hits.filter((hit) => isLikelyApiAccessToken(hit.token, key));

      if (usableHits.length > 0) {
        storeHits(usableHits, onToken, result);
        continue;
      }

      if (resolveReferencedStorageKeys(storage, raw, result, onToken)) {
        continue;
      }

      if (parseFailed && hits.length === 0) {
        result.keysParseFailed += 1;
        continue;
      }

      if (hits.length === 0) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          if (isExpiredCredential(parsed)) {
            result.keysExpired += 1;
          } else {
            result.keysNoSecret += 1;
          }
        } catch {
          result.keysNoSecret += 1;
        }
        continue;
      }

      result.keysNoSecret += 1;
    }

    result.jwtHarvested = harvestJwtsFromStorage(storage, onToken);

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key?.toLowerCase().includes("token.keys")) {
        continue;
      }
      const raw = storage.getItem(key);
      if (raw) {
        resolveReferencedStorageKeys(storage, raw, result, onToken);
      }
    }
  } catch {
    /* storage blocked */
  }

  return result;
}

/** Scan a single cache blob (e.g. IndexedDB value) for tokens. */
export function scanMsalRawEntry(
  storage: Storage | null,
  raw: string,
  keyHint: string,
  onToken: (audience: "flow" | "powerplatform" | "powerapps" | "any", token: string) => void,
  result: MsalScanResult,
): void {
  const { hits } = extractHitsFromRaw(raw, keyHint);
  const usableHits = hits.filter((hit) => isLikelyApiAccessToken(hit.token, keyHint));
  if (usableHits.length > 0) {
    storeHits(usableHits, onToken, result);
    return;
  }

  if (storage && resolveReferencedStorageKeys(storage, raw, result, onToken)) {
    return;
  }

  const matches = raw.match(JWT_PATTERN) ?? [];
  const seen = new Set<string>();
  for (const jwt of matches) {
    if (seen.has(jwt) || !isLikelyApiAccessToken(jwt, keyHint)) {
      continue;
    }
    seen.add(jwt);
    const target = targetFromKeyHint(keyHint);
    for (const aud of audienceFromMsalTarget(target)) {
      onToken(aud, jwt);
    }
    result.jwtHarvested += 1;
    result.tokensFound += 1;
  }
}
