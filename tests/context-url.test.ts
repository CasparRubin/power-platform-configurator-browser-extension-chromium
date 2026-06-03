import { describe, expect, it } from "vitest";
import { parsePowerAutomateTabContext } from "../src/inspector/context-url";

describe("parsePowerAutomateTabContext", () => {
  it("returns null ids for non-Power Automate URLs", () => {
    expect(parsePowerAutomateTabContext("https://example.com/")).toEqual({
      environmentId: null,
      solutionId: null,
      flowId: null,
      runId: null,
      url: null,
    });
  });

  it("parses environment, flow, and run from make.powerautomate.com", () => {
    const url =
      "https://make.powerautomate.com/environments/env-abc/flows/flow-def-123/runs/run-xyz/details";
    expect(parsePowerAutomateTabContext(url)).toEqual({
      environmentId: "env-abc",
      solutionId: null,
      flowId: "flow-def-123",
      runId: "run-xyz",
      url,
    });
  });

  it("parses solution-scoped flow designer URLs", () => {
    const url =
      "https://make.powerautomate.com/environments/env-abc/solutions/sol-99/flows/flow-def-123?v3=false";
    expect(parsePowerAutomateTabContext(url)).toEqual({
      environmentId: "env-abc",
      solutionId: "sol-99",
      flowId: "flow-def-123",
      runId: null,
      url,
    });
  });

  it("parses flow.microsoft.com manage URLs", () => {
    const url = "https://emea.flow.microsoft.com/manage/environments/e1/flows/f1/details";
    expect(parsePowerAutomateTabContext(url)).toEqual({
      environmentId: "e1",
      solutionId: null,
      flowId: "f1",
      runId: null,
      url,
    });
  });
});
