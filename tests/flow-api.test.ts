import { describe, expect, it } from "vitest";
import {
  mapCloudFlows,
  mapEnvironments,
  mapFlowRuns,
  mapPortalFlows,
  mapRunActions,
  formatDuration,
  normalizeEnvironmentId,
  statusTone,
} from "../src/inspector/flow-api";

describe("flow-api mappers", () => {
  it("normalizeEnvironmentId prefers BAP name GUID over ARM id path", () => {
    expect(
      normalizeEnvironmentId(
        "/providers/Microsoft.BusinessAppPlatform/environments/9de890bf-e673-e92d-814d-3183658f1848",
        "9de890bf-e673-e92d-814d-3183658f1848",
      ),
    ).toBe("9de890bf-e673-e92d-814d-3183658f1848");
  });

  it("mapEnvironments extracts display names", () => {
    const body = {
      value: [
        {
          id: "env-1",
          properties: { displayName: "Production", url: "https://org.crm.dynamics.com" },
        },
      ],
    };
    expect(mapEnvironments(body)).toEqual([
      { id: "env-1", displayName: "Production", url: "https://org.crm.dynamics.com" },
    ]);
  });

  it("mapEnvironments maps BAP environment name GUID", () => {
    const body = {
      value: [
        {
          name: "9de890bf-e673-e92d-814d-3183658f1848",
          id: "/providers/Microsoft.BusinessAppPlatform/environments/9de890bf-e673-e92d-814d-3183658f1848",
          properties: { displayName: "Sandbox" },
        },
      ],
    };
    expect(mapEnvironments(body)[0]?.id).toBe("9de890bf-e673-e92d-814d-3183658f1848");
    expect(mapEnvironments(body)[0]?.displayName).toBe("Sandbox");
  });

  it("mapCloudFlows reads workflowId from official API shape", () => {
    const body = {
      value: [
        {
          workflowId: "wf-1",
          properties: { displayName: "My Flow", state: "Started", modifiedOn: "2024-01-01" },
        },
      ],
    };
    expect(mapCloudFlows(body)[0]?.name).toBe("My Flow");
  });

  it("mapPortalFlows reads portal flow list shape", () => {
    const body = {
      value: [
        {
          name: "wf-portal",
          properties: { displayName: "Portal Flow", state: "Started" },
        },
      ],
    };
    expect(mapPortalFlows(body)[0]?.workflowId).toBe("wf-portal");
  });

  it("mapFlowRuns sorts by startTime descending", () => {
    const body = {
      value: [
        { name: "run-old", properties: { status: "Succeeded", startTime: "2024-01-01T00:00:00Z" } },
        { name: "run-new", properties: { status: "Failed", startTime: "2024-02-01T00:00:00Z" } },
      ],
    };
    const runs = mapFlowRuns(body);
    expect(runs[0]?.id).toBe("run-new");
    expect(runs[1]?.id).toBe("run-old");
  });

  it("mapRunActions extracts content links", () => {
    const body = {
      value: [
        {
          name: "HTTP",
          properties: {
            status: "Failed",
            inputsLink: { uri: "https://example.com/inputs" },
            outputsLink: { uri: "https://example.com/outputs" },
            error: { message: "Bad Request" },
          },
        },
      ],
    };
    const actions = mapRunActions(body);
    expect(actions[0]?.inputsLink).toBe("https://example.com/inputs");
    expect(actions[0]?.outputsLink).toBe("https://example.com/outputs");
  });

  it("formatDuration computes seconds and minutes", () => {
    expect(formatDuration("2024-01-01T00:00:00Z", "2024-01-01T00:00:30Z")).toBe("30s");
    expect(formatDuration("2024-01-01T00:00:00Z", "2024-01-01T00:01:05Z")).toBe("1m 5s");
  });

  it("statusTone classifies run statuses", () => {
    expect(statusTone("Succeeded")).toBe("success");
    expect(statusTone("Failed")).toBe("failed");
    expect(statusTone("Running")).toBe("running");
  });
});
