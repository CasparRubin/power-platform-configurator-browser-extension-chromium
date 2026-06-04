/**
 * Global Power Apps form enforcement: reads sync prefs and applies unhide/unlock on tabs
 * with debounce and retry until Xrm form context is available.
 */
import {
  POWERAPPS_SYNC_KEYS,
  parsePowerAppsPreferencesFromSync,
  type PowerAppsPreferences,
} from "../constants";
import { applyPowerAppsFormActionOnTab } from "./apply-form-actions";
import { isPowerAppsHostUrl, type PowerAppsFormActionResult } from "./constants";

const APPLY_DEBOUNCE_MS = 150;
const RETRY_DELAYS_MS = [300, 1000, 2000, 2000, 2000] as const;
const MAX_RETRY_ATTEMPTS = RETRY_DELAYS_MS.length;

type TabScheduleState = {
  debounceTimerId: ReturnType<typeof setTimeout> | null;
  retryTimerId: ReturnType<typeof setTimeout> | null;
  attempt: number;
  inFlight: boolean;
};

const tabScheduleState = new Map<number, TabScheduleState>();

export function shouldEnforceUnhide(prefs: PowerAppsPreferences): boolean {
  return prefs.hidden === "show";
}

export function shouldEnforceUnlock(prefs: PowerAppsPreferences): boolean {
  return prefs.readOnly === "unlock";
}

export function isPowerAppsEnforcementActive(prefs: PowerAppsPreferences): boolean {
  return shouldEnforceUnhide(prefs) || shouldEnforceUnlock(prefs);
}

export function shouldRetryApplyError(error: string | undefined): boolean {
  return (
    error === "no_form_context" || error === "inject_no_result" || error === "injection_failed"
  );
}

export function getRetryDelayMs(attempt: number): number | null {
  if (attempt < 0 || attempt >= MAX_RETRY_ATTEMPTS) {
    return null;
  }
  return RETRY_DELAYS_MS[attempt] ?? null;
}

export async function readPowerAppsPreferencesFromStorage(): Promise<PowerAppsPreferences> {
  const result = await chrome.storage.sync.get([...POWERAPPS_SYNC_KEYS]);
  return parsePowerAppsPreferencesFromSync(result as Record<string, unknown>);
}

function getOrCreateTabState(tabId: number): TabScheduleState {
  let state = tabScheduleState.get(tabId);
  if (!state) {
    state = {
      debounceTimerId: null,
      retryTimerId: null,
      attempt: 0,
      inFlight: false,
    };
    tabScheduleState.set(tabId, state);
  }
  return state;
}

function clearTabRetry(state: TabScheduleState): void {
  if (state.retryTimerId !== null) {
    clearTimeout(state.retryTimerId);
    state.retryTimerId = null;
  }
  state.attempt = 0;
}

export function clearPowerAppsTabScheduleState(tabId: number): void {
  const state = tabScheduleState.get(tabId);
  if (!state) {
    return;
  }
  if (state.debounceTimerId !== null) {
    clearTimeout(state.debounceTimerId);
  }
  clearTabRetry(state);
  tabScheduleState.delete(tabId);
}

function shouldRetryResult(result: PowerAppsFormActionResult): boolean {
  if (result.ok) {
    return false;
  }
  return shouldRetryApplyError(result.error);
}

export async function applyPowerAppsPreferencesOnTab(
  tabId: number,
  prefs: PowerAppsPreferences,
): Promise<PowerAppsFormActionResult[]> {
  const results: PowerAppsFormActionResult[] = [];

  if (shouldEnforceUnhide(prefs)) {
    results.push(await applyPowerAppsFormActionOnTab(tabId, "unhide"));
  }
  if (shouldEnforceUnlock(prefs)) {
    results.push(await applyPowerAppsFormActionOnTab(tabId, "unlock"));
  }

  return results;
}

function scheduleRetry(tabId: number, prefs: PowerAppsPreferences, state: TabScheduleState): void {
  const delay = getRetryDelayMs(state.attempt);
  if (delay === null) {
    clearTabRetry(state);
    return;
  }

  state.attempt += 1;
  state.retryTimerId = setTimeout(() => {
    state.retryTimerId = null;
    void runApplyForTab(tabId, prefs);
  }, delay);
}

async function runApplyForTab(tabId: number, prefs: PowerAppsPreferences): Promise<void> {
  const state = getOrCreateTabState(tabId);

  if (!isPowerAppsEnforcementActive(prefs)) {
    clearTabRetry(state);
    return;
  }

  if (state.inFlight) {
    return;
  }

  state.inFlight = true;
  try {
    const results = await applyPowerAppsPreferencesOnTab(tabId, prefs);
    const needsRetry = results.some((r) => shouldRetryResult(r));
    if (needsRetry && state.retryTimerId === null) {
      scheduleRetry(tabId, prefs, state);
    } else if (!needsRetry) {
      clearTabRetry(state);
    }
  } finally {
    state.inFlight = false;
  }
}

export function schedulePowerAppsApplyForTab(tabId: number): void {
  const state = getOrCreateTabState(tabId);

  if (state.debounceTimerId !== null) {
    clearTimeout(state.debounceTimerId);
  }

  state.debounceTimerId = setTimeout(() => {
    state.debounceTimerId = null;
    void (async () => {
      const prefs = await readPowerAppsPreferencesFromStorage();
      if (!isPowerAppsEnforcementActive(prefs)) {
        clearTabRetry(state);
        return;
      }
      clearTabRetry(state);
      await runApplyForTab(tabId, prefs);
    })();
  }, APPLY_DEBOUNCE_MS);
}

export async function applyPowerAppsPreferencesToAllHostTabs(): Promise<void> {
  const prefs = await readPowerAppsPreferencesFromStorage();
  if (!isPowerAppsEnforcementActive(prefs)) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === undefined || !isPowerAppsHostUrl(tab.url)) {
      continue;
    }
    schedulePowerAppsApplyForTab(tab.id);
  }
}

export async function applyPowerAppsPreferencesOnActiveTab(): Promise<{
  ok: boolean;
  results: PowerAppsFormActionResult[];
}> {
  const prefs = await readPowerAppsPreferencesFromStorage();
  if (!isPowerAppsEnforcementActive(prefs)) {
    return { ok: true, results: [] };
  }

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id === undefined) {
    return {
      ok: false,
      results: [
        {
          ok: false,
          action: "unhide",
          error: "no_active_tab",
        },
      ],
    };
  }

  if (!isPowerAppsHostUrl(activeTab.url)) {
    return {
      ok: false,
      results: [
        {
          ok: false,
          action: "unhide",
          error: "unsupported_host",
        },
      ],
    };
  }

  const results = await applyPowerAppsPreferencesOnTab(activeTab.id, prefs);
  const ok = results.length === 0 || results.every((r) => r.ok);
  return { ok, results };
}

export function installPowerAppsEnforcementListeners(): void {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") {
      return;
    }
    if (!isPowerAppsHostUrl(tab.url)) {
      return;
    }
    schedulePowerAppsApplyForTab(tabId);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    clearPowerAppsTabScheduleState(tabId);
  });
}
