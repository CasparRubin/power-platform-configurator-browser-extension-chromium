/**
 * Hybrid Power Automate API client: official Power Platform API + portal-equivalent run APIs.
 * All requests are proxied through the session bridge (no extension OAuth).
 */
import {
  INSPECTOR_MESSAGE,
  createRequestId,
  type InspectorApiResponseMessage,
} from "./session-bridge";
import { inspectorLog } from "./debug-log";
import type { InspectorAudience } from "./session-bridge";

const POWER_PLATFORM_API = "https://api.powerplatform.com";
const BAP_API = "https://api.bap.microsoft.com";
const FLOW_API = "https://api.flow.microsoft.com";
const API_VERSION = "2024-10-01";
const BAP_API_VERSION = "2020-10-01";
const FLOW_API_VERSION = "2016-11-01";

export type InspectorEnvironment = {
  id: string;
  displayName: string;
  url: string | null;
};

export type InspectorCloudFlow = {
  workflowId: string;
  name: string;
  state: string | null;
  modifiedOn: string | null;
};

export type InspectorFlowRun = {
  id: string;
  name: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
};

export type InspectorRunAction = {
  name: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  error: unknown;
  inputsLink: string | null;
  outputsLink: string | null;
  inputs: unknown;
  outputs: unknown;
  code: string | null;
};

export class InspectorApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "InspectorApiError";
    this.status = status;
  }
}

function flowScopeHeaders(environmentId: string): Record<string, string> {
  return { "x-ms-client-scope": `environment=${environmentId}` };
}

async function bridgeFetch(
  url: string,
  options?: {
    method?: "GET" | "POST";
    audience?: InspectorAudience;
    headers?: Record<string, string>;
  },
): Promise<unknown> {
  const requestId = createRequestId();
  const method = options?.method ?? "GET";
  const audience = options?.audience ?? "powerplatform";

  inspectorLog.info("api", `→ ${method} ${url}`, { requestId, audience });

  const response = await chrome.runtime.sendMessage({
    type: INSPECTOR_MESSAGE.API_REQUEST,
    requestId,
    url,
    method,
    audience: options?.audience ?? "powerplatform",
    headers: options?.headers,
  });

  const typed = response as InspectorApiResponseMessage | undefined;
  if (!typed || typed.type !== INSPECTOR_MESSAGE.API_RESPONSE) {
    inspectorLog.error("api", "Invalid bridge response", { requestId, response });
    throw new InspectorApiError("Invalid bridge response", 0);
  }
  if (!typed.ok) {
    inspectorLog.error("api", `← ${typed.status} ${typed.error ?? "failed"}`, {
      requestId,
      url,
      status: typed.status,
    });
    throw new InspectorApiError(typed.error ?? `HTTP ${typed.status}`, typed.status);
  }
  inspectorLog.info("api", `← ${typed.status} OK`, { requestId, url });
  return typed.body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** BAP returns ARM paths in `id` and the environment GUID in `name`. */
export function normalizeEnvironmentId(rawId: string | null, name: string | null): string {
  if (name && /^[0-9a-f-]{36}$/i.test(name)) {
    return name;
  }
  if (rawId) {
    const tail = rawId.match(/\/environments\/([^/]+)$/i);
    if (tail?.[1]) {
      return tail[1];
    }
    if (!rawId.startsWith("/")) {
      return rawId;
    }
  }
  return name ?? rawId ?? "";
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  return typeof val === "string" ? val : null;
}

export function mapEnvironments(body: unknown): InspectorEnvironment[] {
  const root = asRecord(body);
  const items = asArray(root?.value);
  return items
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }
      const props = asRecord(rec.properties) ?? rec;
      const rawId = readString(rec, "id");
      const name = readString(rec, "name");
      const id = normalizeEnvironmentId(rawId, name);
      const displayName = readString(props, "displayName") ?? readString(props, "name") ?? id;
      const url = readString(props, "url");
      if (!id) {
        return null;
      }
      return { id, displayName, url };
    })
    .filter((e): e is InspectorEnvironment => e !== null);
}

export function mapCloudFlows(body: unknown): InspectorCloudFlow[] {
  const root = asRecord(body);
  const items = asArray(root?.value);
  return items
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }
      const props = asRecord(rec.properties) ?? rec;
      const workflowId =
        readString(rec, "workflowId") ??
        readString(rec, "id") ??
        readString(props, "workflowId") ??
        "";
      const name =
        readString(props, "displayName") ??
        readString(props, "name") ??
        readString(rec, "name") ??
        workflowId;
      const state = readString(props, "state") ?? readString(props, "stateCode") ?? null;
      const modifiedOn =
        readString(props, "modifiedOn") ?? readString(props, "lastModifiedTime") ?? null;
      if (!workflowId) {
        return null;
      }
      return { workflowId, name, state, modifiedOn };
    })
    .filter((f): f is InspectorCloudFlow => f !== null);
}

export function mapPortalFlows(body: unknown): InspectorCloudFlow[] {
  const root = asRecord(body);
  const items = asArray(root?.value);
  return items
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }
      const props = asRecord(rec.properties) ?? rec;
      const workflowId = readString(rec, "name") ?? readString(rec, "id") ?? "";
      const displayName = readString(props, "displayName") ?? workflowId;
      const state = readString(props, "state") ?? null;
      const modifiedOn = readString(props, "lastModifiedTime") ?? null;
      if (!workflowId) {
        return null;
      }
      return { workflowId, name: displayName, state, modifiedOn };
    })
    .filter((f): f is InspectorCloudFlow => f !== null);
}

export function mapFlowRuns(body: unknown): InspectorFlowRun[] {
  const root = asRecord(body);
  const items = asArray(root?.value);
  return items
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) {
        return null;
      }
      const props = asRecord(rec.properties) ?? rec;
      const id = readString(rec, "name") ?? readString(rec, "id") ?? "";
      const status = readString(props, "status") ?? "Unknown";
      const startTime = readString(props, "startTime") ?? null;
      const endTime = readString(props, "endTime") ?? null;
      if (!id) {
        return null;
      }
      return { id, name: id, status, startTime, endTime };
    })
    .filter((r): r is InspectorFlowRun => r !== null)
    .sort((a, b) => {
      const aTime = a.startTime ?? "";
      const bTime = b.startTime ?? "";
      return bTime.localeCompare(aTime);
    });
}

export function mapRunActions(body: unknown): InspectorRunAction[] {
  const root = asRecord(body);
  const items = asArray(root?.value);
  const result: InspectorRunAction[] = [];

  for (const item of items) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    const props = asRecord(rec.properties) ?? rec;
    const name = readString(rec, "name") ?? "";
    const status = readString(props, "status") ?? "Unknown";
    const startTime = readString(props, "startTime") ?? null;
    const endTime = readString(props, "endTime") ?? null;
    const error: unknown = props.error ?? null;
    const inputsLink = readContentLink(props, "inputsLink");
    const outputsLink = readContentLink(props, "outputsLink");
    const code = readString(props, "code") ?? null;
    if (!name) {
      continue;
    }
    result.push({
      name,
      status,
      startTime,
      endTime,
      error,
      inputsLink,
      outputsLink,
      inputs: props.inputs ?? null,
      outputs: props.outputs ?? null,
      code,
    });
  }

  return result;
}

function readContentLink(props: Record<string, unknown>, key: string): string | null {
  const link = asRecord(props[key]);
  if (!link) {
    return null;
  }
  return readString(link, "uri") ?? readString(link, "contentLink") ?? null;
}

export function environmentFromId(
  environmentId: string,
  displayName?: string,
  url?: string | null,
): InspectorEnvironment {
  return {
    id: environmentId,
    displayName: displayName ?? environmentId,
    url: url ?? null,
  };
}

export async function listEnvironments(): Promise<InspectorEnvironment[]> {
  const candidates: { url: string; audience: InspectorAudience }[] = [
    {
      url: `${BAP_API}/providers/Microsoft.BusinessAppPlatform/environments?api-version=${BAP_API_VERSION}&$top=100`,
      audience: "powerapps",
    },
    {
      url: `${POWER_PLATFORM_API}/environmentmanagement/environments?api-version=${API_VERSION}&$top=100`,
      audience: "powerplatform",
    },
  ];

  let lastError: InspectorApiError | null = null;
  for (const candidate of candidates) {
    try {
      const body = await bridgeFetch(candidate.url, { audience: candidate.audience });
      const mapped = mapEnvironments(body);
      if (mapped.length > 0) {
        inspectorLog.info("app", `Environments from ${new URL(candidate.url).hostname}`);
        return mapped;
      }
    } catch (error) {
      lastError =
        error instanceof InspectorApiError ? error : new InspectorApiError(String(error), 0);
      inspectorLog.warn("app", `Environment list candidate failed (${candidate.audience})`, {
        status: lastError.status,
      });
    }
  }

  throw lastError ?? new InspectorApiError("No environments returned", 404);
}

export async function listCloudFlows(environmentId: string): Promise<InspectorCloudFlow[]> {
  const flowHeaders = flowScopeHeaders(environmentId);
  const candidates = [
    `${FLOW_API}/providers/Microsoft.ProcessSimple/environments/${encodeURIComponent(environmentId)}/flows?api-version=${FLOW_API_VERSION}&$top=100`,
    `https://make.powerautomate.com/environments/${encodeURIComponent(environmentId)}/flows?api-version=${FLOW_API_VERSION}&$top=100`,
    `https://flow.microsoft.com/environments/${encodeURIComponent(environmentId)}/flows?api-version=${FLOW_API_VERSION}&$top=100`,
  ];

  let lastError: InspectorApiError | null = null;
  for (const url of candidates) {
    try {
      const body = await bridgeFetch(url, {
        audience: "flow",
        headers: flowHeaders,
      });
      const portalMapped = mapPortalFlows(body);
      if (portalMapped.length > 0) {
        return portalMapped;
      }
      const officialMapped = mapCloudFlows(body);
      if (officialMapped.length > 0) {
        return officialMapped;
      }
    } catch (error) {
      lastError =
        error instanceof InspectorApiError ? error : new InspectorApiError(String(error), 0);
    }
  }

  throw lastError ?? new InspectorApiError("No flows returned", 404);
}

export type FlowRunsListOptions = {
  solutionId?: string | null;
};

const PORTAL_ORIGINS = ["https://make.powerautomate.com", "https://flow.microsoft.com"] as const;

function buildFlowRunListUrls(
  environmentId: string,
  workflowId: string,
  solutionId?: string | null,
): string[] {
  const enc = encodeURIComponent;
  const query = `api-version=${FLOW_API_VERSION}&$top=50`;
  const urls: string[] = [];

  if (solutionId) {
    for (const origin of PORTAL_ORIGINS) {
      urls.push(
        `${origin}/environments/${enc(environmentId)}/solutions/${enc(solutionId)}/flows/${enc(workflowId)}/runs?${query}`,
      );
    }
  }

  urls.push(
    `${FLOW_API}/providers/Microsoft.ProcessSimple/environments/${enc(environmentId)}/flows/${enc(workflowId)}/runs?${query}`,
  );

  for (const origin of PORTAL_ORIGINS) {
    urls.push(
      `${origin}/environments/${enc(environmentId)}/flows/${enc(workflowId)}/runs?${query}`,
    );
    urls.push(
      `${origin}/providers/Microsoft.ProcessSimple/environments/${enc(environmentId)}/flows/${enc(workflowId)}/runs?${query}`,
    );
  }

  return urls;
}

export async function listFlowRuns(
  environmentId: string,
  workflowId: string,
  options?: FlowRunsListOptions,
): Promise<InspectorFlowRun[]> {
  const flowHeaders = flowScopeHeaders(environmentId);
  const candidates = buildFlowRunListUrls(environmentId, workflowId, options?.solutionId);

  let lastError: InspectorApiError | null = null;
  for (const url of candidates) {
    try {
      const body = await bridgeFetch(url, {
        audience: "flow",
        headers: flowHeaders,
      });
      const mapped = mapFlowRuns(body);
      if (mapped.length > 0) {
        return mapped;
      }
    } catch (error) {
      lastError =
        error instanceof InspectorApiError ? error : new InspectorApiError(String(error), 0);
    }
  }

  throw lastError ?? new InspectorApiError("No runs returned", 404);
}

export async function listRunActions(
  environmentId: string,
  workflowId: string,
  runId: string,
): Promise<InspectorRunAction[]> {
  const url = `${FLOW_API}/providers/Microsoft.ProcessSimple/environments/${encodeURIComponent(environmentId)}/flows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/actions?api-version=${FLOW_API_VERSION}&$top=100`;
  const body = await bridgeFetch(url, {
    audience: "flow",
    headers: flowScopeHeaders(environmentId),
  });
  return mapRunActions(body);
}

export async function getRunActionDetail(
  environmentId: string,
  workflowId: string,
  runId: string,
  actionName: string,
): Promise<InspectorRunAction | null> {
  const url = `${FLOW_API}/providers/Microsoft.ProcessSimple/environments/${encodeURIComponent(environmentId)}/flows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/actions/${encodeURIComponent(actionName)}?api-version=${FLOW_API_VERSION}`;
  const body = await bridgeFetch(url, {
    audience: "flow",
    headers: flowScopeHeaders(environmentId),
  });
  const actions = mapRunActions({ value: [body] });
  return actions[0] ?? null;
}

export async function fetchContentLink(uri: string): Promise<unknown> {
  if (!uri) {
    return null;
  }
  const audience = uri.includes("flow.microsoft") ? "flow" : "any";
  return bridgeFetch(uri, { audience: audience as "flow" | "powerplatform" });
}

export async function enrichActionWithContent(
  action: InspectorRunAction,
  environmentId: string,
  workflowId: string,
  runId: string,
): Promise<InspectorRunAction> {
  let enriched = { ...action };

  if (!enriched.inputs && enriched.inputsLink) {
    try {
      enriched = { ...enriched, inputs: await fetchContentLink(enriched.inputsLink) };
    } catch {
      /* keep null */
    }
  }

  if (!enriched.outputs && enriched.outputsLink) {
    try {
      enriched = { ...enriched, outputs: await fetchContentLink(enriched.outputsLink) };
    } catch {
      /* keep null */
    }
  }

  if (!enriched.inputs && !enriched.outputs && !enriched.inputsLink && !enriched.outputsLink) {
    try {
      const detail = await getRunActionDetail(environmentId, workflowId, runId, action.name);
      if (detail) {
        enriched = { ...enriched, ...detail };
        if (detail.inputsLink && !enriched.inputs) {
          enriched.inputs = await fetchContentLink(detail.inputsLink).catch(() => null);
        }
        if (detail.outputsLink && !enriched.outputs) {
          enriched.outputs = await fetchContentLink(detail.outputsLink).catch(() => null);
        }
      }
    } catch {
      /* keep summary */
    }
  }

  return enriched;
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start) {
    return "—";
  }
  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return "—";
  }
  const seconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export function statusTone(status: string): "success" | "failed" | "running" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("succeed") || normalized === "success") {
    return "success";
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return "failed";
  }
  if (normalized.includes("running") || normalized.includes("wait")) {
    return "running";
  }
  return "neutral";
}
