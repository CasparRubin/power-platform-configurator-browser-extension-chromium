import { describe, expect, it } from "vitest";

import { isPowerAppsHostUrl } from "../src/powerapps/constants";

describe("isPowerAppsHostUrl", () => {
  it("accepts org CRM hosts", () => {
    expect(isPowerAppsHostUrl("https://contoso.crm.dynamics.com/main.aspx?appid=abc")).toBe(true);
    expect(isPowerAppsHostUrl("https://contoso.crm4.dynamics.com/")).toBe(true);
  });

  it("accepts apps.powerapps.com", () => {
    expect(isPowerAppsHostUrl("https://apps.powerapps.com/play/e/abc")).toBe(true);
  });

  it("rejects malformed URLs", () => {
    expect(isPowerAppsHostUrl("not-a-url")).toBe(false);
  });

  it("rejects Power Automate and unrelated hosts", () => {
    expect(isPowerAppsHostUrl("https://make.powerautomate.com/environments/x/flows/y")).toBe(false);
    expect(isPowerAppsHostUrl("https://example.com/")).toBe(false);
    expect(isPowerAppsHostUrl(undefined)).toBe(false);
  });
});
