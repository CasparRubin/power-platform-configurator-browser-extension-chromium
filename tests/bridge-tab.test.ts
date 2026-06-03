import { describe, expect, it } from "vitest";
import {
  isMissingContentScriptError,
  isPowerAutomateUrl,
  pickBridgeTab,
} from "../src/inspector/bridge-tab";

describe("bridge-tab", () => {
  it("isPowerAutomateUrl matches make.powerautomate.com flow URLs", () => {
    expect(
      isPowerAutomateUrl(
        "https://make.powerautomate.com/environments/9de890bf-e673-e92d-814d-3183658f1848/solutions/bd636c11-9527-f111-88b4-6045bd2a657d/flows/d4c3823f-6f05-f011-bae1-6045bd2b35ab?v3=false",
      ),
    ).toBe(true);
  });

  it("pickBridgeTab prefers the active Power Automate tab", () => {
    const tabs = [
      { id: 1, url: "https://make.powerautomate.com/home", status: "complete" },
      { id: 2, url: "https://example.com", status: "complete" },
    ];
    const active = {
      id: 99,
      url: "https://make.powerautomate.com/environments/env/flows/flow-id",
      status: "loading",
    };
    expect(pickBridgeTab(tabs, active)?.id).toBe(99);
  });

  it("pickBridgeTab falls back to first complete tab", () => {
    const tabs = [
      { id: 1, url: "https://make.powerautomate.com/a", status: "complete" },
      { id: 2, url: "https://make.powerautomate.com/b", status: "complete" },
    ];
    expect(pickBridgeTab(tabs, { id: 3, url: "https://google.com" })?.id).toBe(1);
  });

  it("isMissingContentScriptError detects chrome messaging failures", () => {
    expect(isMissingContentScriptError(new Error("Receiving end does not exist."))).toBe(true);
    expect(isMissingContentScriptError(new Error("Could not establish connection"))).toBe(true);
    expect(isMissingContentScriptError(new Error("Content bridge timed out"))).toBe(false);
  });
});
