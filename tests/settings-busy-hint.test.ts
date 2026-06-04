import { describe, expect, it } from "vitest";

import {
  policyPanelBusyMode,
  powerAppsPanelBusyMode,
} from "../src/popup/components/SettingsBusyHint";

describe("policyPanelBusyMode", () => {
  it("returns null when idle", () => {
    expect(policyPanelBusyMode(false, false)).toBeNull();
  });

  it("prefers saving over reloading", () => {
    expect(policyPanelBusyMode(true, true)).toBe("saving");
    expect(policyPanelBusyMode(true, false)).toBe("saving");
  });

  it("returns reloading only when not saving", () => {
    expect(policyPanelBusyMode(false, true)).toBe("reloading");
  });
});

describe("powerAppsPanelBusyMode", () => {
  it("returns null when idle", () => {
    expect(powerAppsPanelBusyMode(false, false)).toBeNull();
  });

  it("prefers saving over applying", () => {
    expect(powerAppsPanelBusyMode(true, true)).toBe("saving");
    expect(powerAppsPanelBusyMode(true, false)).toBe("saving");
  });

  it("returns applying only when not saving", () => {
    expect(powerAppsPanelBusyMode(false, true)).toBe("applying");
  });
});
