import { describe, expect, it } from "vitest";

import { powerAppsFormActionInPage } from "../src/powerapps/xrm-page-script";

/** Retired module-level helpers — must not appear as calls in the serialized inject function. */
const RETIRED_MODULE_HELPER_NAMES = [
  "pageResolveFormContext",
  "pageUnhide",
  "pageUnlock",
  "pageForEachCollection",
  "pageSetVisible",
  "pageSetEnabled",
];

describe("powerAppsFormActionInPage inject safety", () => {
  it("does not reference retired module-level helper identifiers", () => {
    const source = powerAppsFormActionInPage.toString();
    for (const name of RETIRED_MODULE_HELPER_NAMES) {
      expect(source).not.toContain(`${name}(`);
    }
  });

  it("does not use undocumented getGlobalContext().getFormContext()", () => {
    const source = powerAppsFormActionInPage.toString();
    expect(source).not.toMatch(/getGlobalContext\s*\(\s*\)\s*\.?\s*getFormContext/);
  });

  it("defines nested resolve and form-walk logic inside the function", () => {
    const source = powerAppsFormActionInPage.toString();
    expect(source).toContain("resolveFormContext");
    expect(source).toContain("unhideIfHidden");
    expect(source).toContain("unlockIfDisabled");
    expect(source).toContain("Xrm");
  });
});
