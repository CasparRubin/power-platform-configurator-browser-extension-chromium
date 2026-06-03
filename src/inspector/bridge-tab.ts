/** Pick which Power Automate tab should host the session bridge. */

export function isPowerAutomateUrl(urlValue: string): boolean {
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    return /(^|\.)powerautomate\.com$/i.test(host) || /(^|\.)flow\.microsoft\.com$/i.test(host);
  } catch {
    return false;
  }
}

export type BridgeTabCandidate = {
  id?: number;
  url?: string;
  status?: string;
};

/**
 * Prefer the active tab when it is Power Automate (user is usually inspecting that page),
 * otherwise the first completed tab, otherwise any matching tab.
 */
export function pickBridgeTab(
  tabs: BridgeTabCandidate[],
  activeTab: BridgeTabCandidate | undefined,
): BridgeTabCandidate | null {
  if (activeTab?.id !== undefined && activeTab.url && isPowerAutomateUrl(activeTab.url)) {
    return activeTab;
  }

  const complete = tabs.filter(
    (t) => t.id !== undefined && t.status === "complete" && t.url && isPowerAutomateUrl(t.url),
  );
  if (complete.length > 0) {
    return complete[0] ?? null;
  }

  return tabs.find((t) => t.id !== undefined && t.url && isPowerAutomateUrl(t.url)) ?? null;
}

export function isMissingContentScriptError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}
