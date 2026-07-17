/**
 * ISOLATED-world content script on Dataverse org hosts (`POWERAPPS_URL_PATTERNS` in
 * `powerapps/constants.ts`: one explicit pattern per CRM cluster, sovereign `.de` / `.us` / `.cn`
 * hosts, plus `apps.powerapps.com`). When sync prefs enforce Show/Unlock, asks the service worker
 * to apply on navigation and SPA updates (debounced per tab).
 */
import { POWERAPPS_SYNC_KEYS, parsePowerAppsPreferencesFromSync } from "./constants";
import { isPowerAppsEnforcementActive } from "./powerapps/apply-preferences";
import { POWERAPPS_MESSAGE } from "./powerapps/constants";
import { getPowerAppsScheduleHrefKey } from "./powerapps/schedule-apply-key";
import { isPowerAppsSyncChange } from "./storage-sync";

const BOOTSTRAP_KEY = "__ppConfiguratorPowerAppsContentBootstrapped";

const globalScope = globalThis as typeof globalThis & {
  [BOOTSTRAP_KEY]?: boolean;
};

function sendScheduleApply(): void {
  void chrome.runtime.sendMessage({ type: POWERAPPS_MESSAGE.SCHEDULE_APPLY }).catch(() => {
    /* Extension context invalidated or background unavailable. */
  });
}

if (!globalScope[BOOTSTRAP_KEY]) {
  globalScope[BOOTSTRAP_KEY] = true;

  let isHistoryPatched = false;
  let lastScheduledHrefKey = "";
  let fallbackTimerId: number | null = null;
  let fallbackStopTimerId: number | null = null;
  let fallbackObserver: MutationObserver | null = null;
  let observerScheduleRafId: number | null = null;

  function scheduleApplyFromPage(): void {
    const hrefKey = getPowerAppsScheduleHrefKey(window.location.href);
    if (hrefKey === lastScheduledHrefKey) {
      return;
    }
    lastScheduledHrefKey = hrefKey;
    sendScheduleApply();
  }

  function scheduleApplyFromMutationObserver(): void {
    if (observerScheduleRafId !== null) {
      return;
    }
    observerScheduleRafId = window.requestAnimationFrame(() => {
      observerScheduleRafId = null;
      scheduleApplyFromPage();
    });
  }

  function patchHistoryApi(): void {
    if (isHistoryPatched) {
      return;
    }
    isHistoryPatched = true;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function pushStateWrapper(
      ...args: Parameters<History["pushState"]>
    ) {
      const result = originalPushState(...args);
      scheduleApplyFromPage();
      return result;
    };

    window.history.replaceState = function replaceStateWrapper(
      ...args: Parameters<History["replaceState"]>
    ) {
      const result = originalReplaceState(...args);
      scheduleApplyFromPage();
      return result;
    };
  }

  function stopShortLivedFallback(): void {
    if (fallbackTimerId !== null) {
      window.clearInterval(fallbackTimerId);
      fallbackTimerId = null;
    }
    if (fallbackStopTimerId !== null) {
      window.clearTimeout(fallbackStopTimerId);
      fallbackStopTimerId = null;
    }
    if (fallbackObserver) {
      fallbackObserver.disconnect();
      fallbackObserver = null;
    }
    if (observerScheduleRafId !== null) {
      window.cancelAnimationFrame(observerScheduleRafId);
      observerScheduleRafId = null;
    }
  }

  function startShortLivedFallback(): void {
    stopShortLivedFallback();

    fallbackTimerId = window.setInterval(() => {
      scheduleApplyFromPage();
    }, 400);

    fallbackStopTimerId = window.setTimeout(() => {
      stopShortLivedFallback();
    }, 6000);

    try {
      fallbackObserver = new MutationObserver(() => {
        scheduleApplyFromMutationObserver();
      });

      if (document.documentElement) {
        fallbackObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      } else {
        window.addEventListener("DOMContentLoaded", function onDomContentLoaded() {
          window.removeEventListener("DOMContentLoaded", onDomContentLoaded);
          if (fallbackObserver && document.documentElement) {
            fallbackObserver.observe(document.documentElement, {
              childList: true,
              subtree: true,
            });
          }
        });
      }
    } catch {
      fallbackObserver = null;
    }
  }

  function startWatchdogIfEnforcementActive(
    prefs: ReturnType<typeof parsePowerAppsPreferencesFromSync>,
  ): void {
    if (!isPowerAppsEnforcementActive(prefs)) {
      stopShortLivedFallback();
      return;
    }

    lastScheduledHrefKey = "";
    scheduleApplyFromPage();
    startShortLivedFallback();
    patchHistoryApi();
  }

  void chrome.storage.sync.get([...POWERAPPS_SYNC_KEYS]).then((result) => {
    const prefs = parsePowerAppsPreferencesFromSync(result as Record<string, unknown>);
    startWatchdogIfEnforcementActive(prefs);
  });

  window.addEventListener("popstate", () => {
    scheduleApplyFromPage();
    void chrome.storage.sync.get([...POWERAPPS_SYNC_KEYS]).then((result) => {
      const prefs = parsePowerAppsPreferencesFromSync(result as Record<string, unknown>);
      if (isPowerAppsEnforcementActive(prefs)) {
        startShortLivedFallback();
      }
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (!isPowerAppsSyncChange(areaName, changes as Record<string, unknown>)) {
      return;
    }

    void chrome.storage.sync.get([...POWERAPPS_SYNC_KEYS]).then((result) => {
      const prefs = parsePowerAppsPreferencesFromSync(result as Record<string, unknown>);
      startWatchdogIfEnforcementActive(prefs);
    });
  });
}
