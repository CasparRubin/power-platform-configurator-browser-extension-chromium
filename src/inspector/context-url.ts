/** Parse environment / flow / run IDs from Power Automate portal URLs. */

export type PowerAutomateTabContext = {
  environmentId: string | null;
  solutionId: string | null;
  flowId: string | null;
  runId: string | null;
  url: string | null;
};

const PA_HOST_PATTERN = /(^|\.)powerautomate\.com$/i;
const FLOW_HOST_PATTERN = /(^|\.)flow\.microsoft\.com$/i;

function isPowerAutomateHost(hostname: string): boolean {
  return PA_HOST_PATTERN.test(hostname) || FLOW_HOST_PATTERN.test(hostname);
}

/**
 * Extracts IDs from paths like:
 * `/environments/{envId}/flows/{flowId}/...`
 * `/environments/{envId}/flows/{flowId}/runs/{runId}/...`
 */
export function parsePowerAutomateTabContext(urlValue: string): PowerAutomateTabContext {
  const empty: PowerAutomateTabContext = {
    environmentId: null,
    solutionId: null,
    flowId: null,
    runId: null,
    url: urlValue,
  };

  try {
    const parsed = new URL(urlValue);
    if (!isPowerAutomateHost(parsed.hostname)) {
      return { ...empty, url: null };
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    let environmentId: string | null = null;
    let solutionId: string | null = null;
    let flowId: string | null = null;
    let runId: string | null = null;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i]?.toLowerCase();
      if (segment === "environments" && segments[i + 1]) {
        environmentId = segments[i + 1] ?? null;
        i += 1;
      } else if (segment === "solutions" && segments[i + 1]) {
        solutionId = segments[i + 1] ?? null;
        i += 1;
      } else if (segment === "flows" && segments[i + 1]) {
        flowId = segments[i + 1] ?? null;
        i += 1;
      } else if (segment === "runs" && segments[i + 1]) {
        runId = segments[i + 1] ?? null;
        i += 1;
      }
    }

    return { environmentId, solutionId, flowId, runId, url: urlValue };
  } catch {
    return empty;
  }
}
