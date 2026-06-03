import { describe, expect, it } from "vitest";
import { expectedResourcesForApiUrl, jwtMatchesApiUrl } from "../src/inspector/token-match";

const JWT_HEADER = "eyJhbGciOiJub25lIn0";
const JWT_SIG = "sig";

function jwtWithAud(aud: string | string[]): string {
  const payload = btoa(JSON.stringify({ aud, scp: "user" }));
  return `${JWT_HEADER}.${payload}.${JWT_SIG}`;
}

describe("token-match", () => {
  it("expectedResourcesForApiUrl includes powerapps for BAP host", () => {
    expect(
      expectedResourcesForApiUrl(
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments",
      ),
    ).toContain("service.powerapps.com");
  });

  it("jwtMatchesApiUrl accepts matching service.powerapps audience", () => {
    const jwt = jwtWithAud("https://service.powerapps.com/");
    expect(
      jwtMatchesApiUrl(
        jwt,
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments",
      ),
    ).toBe(true);
  });

  it("jwtMatchesApiUrl rejects flow token for BAP URL", () => {
    const jwt = jwtWithAud("https://service.flow.microsoft.com/");
    expect(
      jwtMatchesApiUrl(
        jwt,
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments",
      ),
    ).toBe(false);
  });

  it("jwtMatchesApiUrl rejects powerplatform token for BAP URL", () => {
    const jwt = jwtWithAud("https://api.powerplatform.com");
    expect(
      jwtMatchesApiUrl(
        jwt,
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments",
      ),
    ).toBe(false);
  });
});
