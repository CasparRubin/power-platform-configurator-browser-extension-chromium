import { describe, expect, it, vi } from "vitest";
import { audienceFromMsalTarget, scanMsalStorage } from "../src/inspector/msal-token-scan";

const JWT = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";

function mockStorage(entries: Record<string, string>): Storage {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  } as Storage;
}

describe("msal-token-scan", () => {
  it("extracts classic MSAL access token secret + target", () => {
    const stored: string[] = [];
    scanMsalStorage(
      mockStorage({
        "msal.client.accesstoken.account": JSON.stringify({
          credentialType: "AccessToken",
          secret: JWT,
          target: "https://api.powerplatform.com/user_impersonation",
          expiresOn: String(Math.floor(Date.now() / 1000) + 3600),
        }),
      }),
      (_aud, token) => stored.push(token),
    );
    expect(stored).toContain(JWT);
  });

  it("reads accessToken field and scope from key hint", () => {
    const stored: string[] = [];
    scanMsalStorage(
      mockStorage({
        "msal.client.accesstoken.flow": JSON.stringify({
          credentialType: "AccessToken",
          accessToken: JWT,
          expiresOn: String(Date.now() + 60_000),
        }),
      }),
      (_aud, token) => stored.push(token),
    );
    expect(stored.length).toBeGreaterThan(0);
  });

  it("audienceFromMsalTarget maps power platform and flow", () => {
    expect(audienceFromMsalTarget("https://api.powerplatform.com/")).toContain("powerplatform");
    expect(audienceFromMsalTarget("https://service.flow.microsoft.com/")).toContain("flow");
    expect(audienceFromMsalTarget("https://service.powerapps.com/")).toContain("powerapps");
  });

  it("skips expired credentials", () => {
    const stored: string[] = [];
    const result = scanMsalStorage(
      mockStorage({
        "msal.client.accesstoken.expired": JSON.stringify({
          credentialType: "AccessToken",
          secret: JWT,
          target: "https://api.powerplatform.com/",
          expiresOn: "1",
        }),
      }),
      (_aud, token) => stored.push(token),
    );
    expect(stored).toHaveLength(0);
    expect(result.keysExpired).toBeGreaterThan(0);
  });

  it("resolves MSAL token.keys index entries", () => {
    const stored: string[] = [];
    const future = String(Math.floor(Date.now() / 1000) + 3600);
    const result = scanMsalStorage(
      mockStorage({
        "msal.token.keys.client": JSON.stringify(["msal.cache.accesstoken.entry"]),
        "msal.cache.accesstoken.entry": JSON.stringify({
          credentialType: "AccessToken",
          secret: JWT,
          target: "https://api.powerplatform.com/user_impersonation",
          expiresOn: future,
        }),
      }),
      (_aud, token) => stored.push(token),
    );
    expect(stored).toContain(JWT);
    expect(result.tokenKeyRefsResolved).toBeGreaterThan(0);
  });
});
