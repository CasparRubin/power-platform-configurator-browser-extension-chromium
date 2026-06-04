import { describe, expect, it } from "vitest";
import { getPowerAppsScheduleHrefKey } from "../src/powerapps/schedule-apply-key";

describe("getPowerAppsScheduleHrefKey", () => {
  it("normalizes valid URLs to href", () => {
    expect(getPowerAppsScheduleHrefKey("https://org.crm17.dynamics.com/main.aspx")).toBe(
      "https://org.crm17.dynamics.com/main.aspx",
    );
  });

  it("falls back to raw string for invalid URLs", () => {
    expect(getPowerAppsScheduleHrefKey("not-a-url")).toBe("not-a-url");
  });
});
