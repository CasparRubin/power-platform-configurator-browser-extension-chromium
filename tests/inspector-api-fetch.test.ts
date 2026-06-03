import { describe, expect, it } from "vitest";
import { audienceForApiUrl } from "../src/background/inspector-api-fetch";

describe("inspector-api-fetch", () => {
  it("audienceForApiUrl maps Power Platform and Flow hosts", () => {
    expect(
      audienceForApiUrl(
        "https://api.powerplatform.com/environmentmanagement/environments?api-version=2024-10-01",
      ),
    ).toBe("powerplatform");
    expect(
      audienceForApiUrl(
        "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/x/flows",
      ),
    ).toBe("flow");
    expect(
      audienceForApiUrl(
        "https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments",
      ),
    ).toBe("powerapps");
  });
});
