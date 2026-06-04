import { describe, expect, it } from "vitest";

import { isConfiguratorSyncChange, isPowerAppsSyncChange } from "../src/storage-sync";

describe("isConfiguratorSyncChange", () => {
  it("returns true when enforcedV3 changes in sync", () => {
    expect(
      isConfiguratorSyncChange("sync", {
        enforcedV3: { newValue: "true" },
      }),
    ).toBe(true);
  });

  it("returns true when v3surveyEnabled changes in sync", () => {
    expect(
      isConfiguratorSyncChange("sync", {
        v3surveyEnabled: { newValue: "false" },
      }),
    ).toBe(true);
  });

  it("returns true when both policy keys change in sync", () => {
    expect(
      isConfiguratorSyncChange("sync", {
        enforcedV3: { newValue: "false" },
        v3surveyEnabled: { newValue: "true" },
      }),
    ).toBe(true);
  });

  it("returns true when enforcedV3 is removed from sync", () => {
    expect(
      isConfiguratorSyncChange("sync", {
        enforcedV3: { oldValue: "true" },
      }),
    ).toBe(true);
  });

  it("returns false for local area even when keys match", () => {
    expect(
      isConfiguratorSyncChange("local", {
        enforcedV3: { newValue: "true" },
      }),
    ).toBe(false);
    expect(
      isConfiguratorSyncChange("local", {
        v3surveyEnabled: { newValue: "false" },
      }),
    ).toBe(false);
  });

  it("returns false for unrelated sync keys", () => {
    expect(isConfiguratorSyncChange("sync", { otherKey: {} })).toBe(false);
  });

  it("returns false for empty changes", () => {
    expect(isConfiguratorSyncChange("sync", {})).toBe(false);
  });

  it("returns true when only one of multiple changes is a policy key", () => {
    const changes = {
      enforcedV3: { newValue: "off" },
      unrelated: { newValue: 1 },
    };
    expect(isConfiguratorSyncChange("sync", changes)).toBe(true);
  });
});

describe("isPowerAppsSyncChange", () => {
  it("is true when powerAppsHiddenFields or powerAppsReadOnly changes in sync", () => {
    expect(
      isPowerAppsSyncChange("sync", {
        powerAppsHiddenFields: {},
      }),
    ).toBe(true);
    expect(
      isPowerAppsSyncChange("sync", {
        powerAppsReadOnly: {},
      }),
    ).toBe(true);
  });

  it("is false for local area or unrelated keys", () => {
    expect(isPowerAppsSyncChange("local", { powerAppsHiddenFields: {} })).toBe(false);
    expect(isPowerAppsSyncChange("sync", { enforcedV3: {} })).toBe(false);
  });
});
