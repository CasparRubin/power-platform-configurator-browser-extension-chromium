/**
 * MV3 service worker: toggles DNR rulesets from sync `enforcedV3`, configures `PowerAutomateUrlPolicy`
 * from `enforcedV3` + `v3surveyEnabled`, updates the toolbar badge, and rewrites main-frame flow/run URLs
 * via `webNavigation` and `tabs.update` when enforcement is not paused. Static DNR JSON only adjusts `v3`;
 * `v3survey` (**Hide** / **Show**) uses the same URL policy as the content script.
 *
 * Power Apps: reads `powerAppsHiddenFields` / `powerAppsReadOnly` from sync and globally enforces **Show** /
 * **Unlock** via `apply-preferences.ts` (`tabs.onUpdated`, `storage.onChanged`, messages from `content-powerapps.js`).
 *
 * Main-frame `webNavigation` listeners await `policyQueue.awaitReconcileCaughtUp()` before URL work so
 * policy is never applied from stale default module state ahead of the first `chrome.storage.sync`-backed
 * `reconcileFromStorage` (see `src/policy-load-queue.ts`, Chrome MV3 storage preload pattern).
 */
import {
  installPowerAppsRouter,
  onPowerAppsSyncStorageChanged,
} from "./background/powerapps-router";
import { installPowerAppsEnforcementListeners } from "./powerapps/apply-preferences";
import { applyToolbarBadgeForEnforcement } from "./action-badge";
import {
  DEFAULT_ENFORCED_V3,
  needsDefaultEnforcedV3Seed,
  needsDefaultPowerAppsHiddenFieldsSeed,
  needsDefaultPowerAppsReadOnlySeed,
  needsDefaultV3SurveyEnabledSeed,
  parseEnforcementPreference,
  parseV3SurveyEnabled,
  DEFAULT_POWERAPPS_HIDDEN_FIELDS,
  DEFAULT_POWERAPPS_READ_ONLY,
  STORAGE_KEY_ENFORCED_V3,
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
  STORAGE_KEY_V3SURVEY_ENABLED,
  SYNC_POLICY_KEYS,
  POWERAPPS_SYNC_KEYS,
  type EnforcementPreference,
} from "./constants";
import { buildUpdateRulesetOptions } from "./dnr-rulesets";
import { isMainFrameTabNavigation } from "./navigation-guards";
import { createPolicyLoadQueue } from "./policy-load-queue";
import { isConfiguratorSyncChange, isPowerAppsSyncChange } from "./storage-sync";
import { PowerAutomateUrlPolicy } from "./url-policy";

/**
 * Dedupes redundant `tabs.update` calls per tab. Not persisted: MV3 extension service workers can
 * terminate when idle; after wake this map is empty so we may issue extra updates until it refills.
 */
const lastCanonicalKeyByTabId: Record<number, string> = Object.create(null);

function clearTabCanonicalKey(tabId: number): void {
  delete lastCanonicalKeyByTabId[tabId];
}

function enforceCanonicalOnTab(tabId: number, urlValue: string): void {
  if (PowerAutomateUrlPolicy.isEnforcementPaused()) {
    clearTabCanonicalKey(tabId);
    return;
  }

  if (!PowerAutomateUrlPolicy.isTargetUrl(urlValue)) {
    clearTabCanonicalKey(tabId);
    return;
  }

  const incomingCanonicalKey = PowerAutomateUrlPolicy.getCanonicalKey(urlValue);
  if (incomingCanonicalKey && lastCanonicalKeyByTabId[tabId] === incomingCanonicalKey) {
    return;
  }

  const nextUrl = PowerAutomateUrlPolicy.canonicalizeToEnforced(urlValue);
  if (!nextUrl) {
    if (incomingCanonicalKey) {
      lastCanonicalKeyByTabId[tabId] = incomingCanonicalKey;
    } else {
      clearTabCanonicalKey(tabId);
    }
    return;
  }

  const nextCanonicalKey = PowerAutomateUrlPolicy.getCanonicalKey(nextUrl);
  if (nextCanonicalKey) {
    lastCanonicalKeyByTabId[tabId] = nextCanonicalKey;
  }

  chrome.tabs.update(tabId, { url: nextUrl }, () => {
    if (chrome.runtime.lastError) {
      clearTabCanonicalKey(tabId);
    }
  });
}

const POWER_AUTOMATE_URL_FILTERS: chrome.events.UrlFilter[] = [
  { hostSuffix: "powerautomate.com", schemes: ["https"] },
  { hostEquals: "flow.microsoft.com", schemes: ["https"] },
];

async function applyRulesetsForPreference(mode: EnforcementPreference): Promise<void> {
  const options = buildUpdateRulesetOptions(mode);
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(options);
  } catch (error) {
    console.error(
      "[power-platform-configurator] declarativeNetRequest.updateEnabledRulesets failed",
      { mode, options, error },
    );
    throw error;
  }
}

async function reconcileFromStorage(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(SYNC_POLICY_KEYS);
    const preference = parseEnforcementPreference(result[STORAGE_KEY_ENFORCED_V3]);
    const surveyOn = parseV3SurveyEnabled(result[STORAGE_KEY_V3SURVEY_ENABLED]);
    PowerAutomateUrlPolicy.configure({ preference, v3surveyEnabled: surveyOn });
    applyToolbarBadgeForEnforcement(preference);
    await applyRulesetsForPreference(preference);
  } catch (error) {
    console.error("[power-platform-configurator] reconcileFromStorage failed", error);
  }
}

const policyQueue = createPolicyLoadQueue(reconcileFromStorage);

installPowerAppsRouter();
installPowerAppsEnforcementListeners();

async function handleMainFrameNavigation(
  details: chrome.webNavigation.WebNavigationFramedCallbackDetails,
): Promise<void> {
  await policyQueue.awaitReconcileCaughtUp();
  if (!isMainFrameTabNavigation(details)) {
    return;
  }
  enforceCanonicalOnTab(details.tabId, details.url);
}

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    void handleMainFrameNavigation(details).catch((error) => {
      console.error("[power-platform-configurator] onCommitted handler failed", error);
    });
  },
  { url: POWER_AUTOMATE_URL_FILTERS },
);

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    void handleMainFrameNavigation(details).catch((error) => {
      console.error("[power-platform-configurator] onHistoryStateUpdated handler failed", error);
    });
  },
  { url: POWER_AUTOMATE_URL_FILTERS },
);

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabCanonicalKey(tabId);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const syncChanges = changes as Record<string, unknown>;
  if (isConfiguratorSyncChange(areaName, syncChanges)) {
    policyQueue.scheduleReconcile();
  }
  if (isPowerAppsSyncChange(areaName, syncChanges)) {
    onPowerAppsSyncStorageChanged();
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  policyQueue.chainAfterTail(async () => {
    try {
      if (details.reason === "install") {
        const existing = await chrome.storage.sync.get([
          ...SYNC_POLICY_KEYS,
          ...POWERAPPS_SYNC_KEYS,
        ]);
        const rawMode = existing[STORAGE_KEY_ENFORCED_V3];
        const rawSurvey = existing[STORAGE_KEY_V3SURVEY_ENABLED];
        const rawHidden = existing[STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS];
        const rawReadOnly = existing[STORAGE_KEY_POWERAPPS_READ_ONLY];
        const toSet: Record<string, string> = {};
        if (needsDefaultEnforcedV3Seed(rawMode)) {
          toSet[STORAGE_KEY_ENFORCED_V3] = DEFAULT_ENFORCED_V3;
        }
        if (needsDefaultV3SurveyEnabledSeed(rawSurvey)) {
          toSet[STORAGE_KEY_V3SURVEY_ENABLED] = "false";
        }
        if (needsDefaultPowerAppsHiddenFieldsSeed(rawHidden)) {
          toSet[STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS] = DEFAULT_POWERAPPS_HIDDEN_FIELDS;
        }
        if (needsDefaultPowerAppsReadOnlySeed(rawReadOnly)) {
          toSet[STORAGE_KEY_POWERAPPS_READ_ONLY] = DEFAULT_POWERAPPS_READ_ONLY;
        }
        if (Object.keys(toSet).length > 0) {
          await chrome.storage.sync.set(toSet);
        }
      }
      await reconcileFromStorage();
      onPowerAppsSyncStorageChanged();
    } catch (error) {
      console.error("[power-platform-configurator] onInstalled policy chain failed", error);
    }
  });
});
