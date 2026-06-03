import { describe, expect, it } from "vitest";
import {
  alternatePortalApiUrl,
  resolvePortalFetchUrl,
  toPortalProxyUrl,
} from "../src/inspector/portal-proxy-url";

describe("portal-proxy-url", () => {
  it("maps BAP and Flow API paths onto the portal origin", () => {
    const origin = "https://make.powerautomate.com";
    expect(
      toPortalProxyUrl(
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments?api-version=2020-10-01",
        origin,
      ),
    ).toBe(
      "https://make.powerautomate.com/providers/Microsoft.BusinessAppPlatform/environments?api-version=2020-10-01",
    );
    expect(
      toPortalProxyUrl(
        "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/env-id/flows?api-version=2016-11-01",
        origin,
      ),
    ).toBe(
      "https://make.powerautomate.com/providers/Microsoft.ProcessSimple/environments/env-id/flows?api-version=2016-11-01",
    );
  });

  it("does not proxy powerplatform-only management routes", () => {
    expect(
      toPortalProxyUrl(
        "https://api.powerplatform.com/environmentmanagement/environments?api-version=2024-10-01",
        "https://make.powerautomate.com",
      ),
    ).toBeNull();
  });

  it("alternatePortalApiUrl maps Flow RP list to portal environments path", () => {
    expect(
      alternatePortalApiUrl(
        "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/env-1/flows?api-version=2016-11-01",
        "https://make.powerautomate.com",
      ),
    ).toBe("https://make.powerautomate.com/environments/env-1/flows?api-version=2016-11-01");
  });

  it("alternatePortalApiUrl maps Flow RP runs to portal environments path", () => {
    expect(
      alternatePortalApiUrl(
        "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/env-1/flows/flow-1/runs?api-version=2016-11-01&$top=50",
        "https://make.powerautomate.com",
      ),
    ).toBe(
      "https://make.powerautomate.com/environments/env-1/flows/flow-1/runs?api-version=2016-11-01&$top=50",
    );
  });

  it("resolvePortalFetchUrl prefers direct proxy then alternate", () => {
    expect(
      resolvePortalFetchUrl(
        "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/x/flows?api-version=2016-11-01",
        "https://make.powerautomate.com",
      ),
    ).toBe(
      "https://make.powerautomate.com/providers/Microsoft.ProcessSimple/environments/x/flows?api-version=2016-11-01",
    );
  });
});
