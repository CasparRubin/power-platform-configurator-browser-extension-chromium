import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeInfo } from "lucide-react";
import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import { POPUP_ROOT_CLASS, TAB_CONTENT_CLASS, TAB_PANEL_HOST_CLASS } from "./popup-layout";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@helvety/ui/tabs";
import {
  DEFAULT_ENFORCEMENT_PREFERENCE,
  DEFAULT_POWERAPPS_HIDDEN_FIELDS,
  DEFAULT_POWERAPPS_READ_ONLY,
  parseEnforcementPreference,
  parsePowerAppsPreferencesFromSync,
  parseV3SurveyEnabled,
  POPUP_SYNC_SETTINGS_KEYS,
  STORAGE_KEY_ENFORCED_V3,
  STORAGE_KEY_POPUP_THEME,
  STORAGE_KEY_V3SURVEY_ENABLED,
  SYNC_POLICY_KEYS,
  type EnforcementPreference,
  type PowerAppsHiddenFieldsMode,
  type PowerAppsReadOnlyMode,
} from "../constants";
import { AboutPanel } from "./components/AboutPanel";
import { PopupHeader } from "./components/PopupHeader";
import { PopupNotificationRegion } from "./components/PopupNotificationRegion";
import { TabProductIcon } from "./components/TabProductIcon";
import { PowerAppsPanel } from "./components/PowerAppsPanel";
import { PowerAutomatePanel } from "./components/PowerAutomatePanel";
import type { SettingsStatusVariant } from "./infer-settings-status-variant";
import { persistPolicyPreferenceAndOptionalReload } from "./persist-policy-preference";
import { shouldShowPopupTabNotification } from "./popup-notification-visibility";
import { createAsyncQueue } from "./sync-write-queue";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

type SurveyEnabledSync = "true" | "false";

type PopupTab = "power-automate" | "power-apps" | "about";

export default function App() {
  const [value, setValue] = useState<EnforcementPreference>(DEFAULT_ENFORCEMENT_PREFERENCE);
  const [surveyMode, setSurveyMode] = useState<SurveyEnabledSync>("false");
  const [hiddenMode, setHiddenMode] = useState<PowerAppsHiddenFieldsMode>(
    DEFAULT_POWERAPPS_HIDDEN_FIELDS,
  );
  const [readOnlyMode, setReadOnlyMode] = useState<PowerAppsReadOnlyMode>(
    DEFAULT_POWERAPPS_READ_ONLY,
  );
  const { themePreference, themeLoaded, saveTheme } = usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const loaded = themeLoaded && settingsLoaded;
  const [activeTab, setActiveTab] = useState<PopupTab>("power-automate");
  const [powerAutomateStatus, setPowerAutomateStatus] = useState("");
  const [powerAppsStatusMessage, setPowerAppsStatusMessage] = useState("");
  const [powerAppsStatusVariant, setPowerAppsStatusVariant] = useState<
    SettingsStatusVariant | undefined
  >();
  const [isPolicySyncBusy, setIsPolicySyncBusy] = useState(false);
  const [isTargetTabReloadBusy, setIsTargetTabReloadBusy] = useState(false);
  const [isPowerAppsSyncBusy, setIsPowerAppsSyncBusy] = useState(false);
  const [isPowerAppsApplying, setIsPowerAppsApplying] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string>("");
  const powerAutomateStatusClearTimerRef = useRef<number | null>(null);
  const powerAppsStatusClearTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const enforcementRef = useRef<EnforcementPreference>(DEFAULT_ENFORCEMENT_PREFERENCE);
  const syncWriteDepthRef = useRef(0);
  const powerAppsSyncWriteDepthRef = useRef(0);
  const editorWriteQueue = useMemo(() => createAsyncQueue(), []);
  const surveyWriteQueue = useMemo(() => createAsyncQueue(), []);

  const beginSyncWrite = useCallback(() => {
    syncWriteDepthRef.current += 1;
    if (syncWriteDepthRef.current === 1) {
      setIsPolicySyncBusy(true);
    }
  }, []);

  const endSyncWrite = useCallback(() => {
    syncWriteDepthRef.current -= 1;
    if (syncWriteDepthRef.current <= 0) {
      syncWriteDepthRef.current = 0;
      setIsPolicySyncBusy(false);
    }
  }, []);

  const beginPowerAppsSyncWrite = useCallback(() => {
    powerAppsSyncWriteDepthRef.current += 1;
    if (powerAppsSyncWriteDepthRef.current === 1) {
      setIsPowerAppsSyncBusy(true);
    }
  }, []);

  const endPowerAppsSyncWrite = useCallback(() => {
    powerAppsSyncWriteDepthRef.current -= 1;
    if (powerAppsSyncWriteDepthRef.current <= 0) {
      powerAppsSyncWriteDepthRef.current = 0;
      setIsPowerAppsSyncBusy(false);
    }
  }, []);

  useEffect(() => {
    enforcementRef.current = value;
  }, [value]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setExtensionVersion(readExtensionVersion());
  }, []);

  useEffect(() => {
    void chrome.storage.sync
      .get([...POPUP_SYNC_SETTINGS_KEYS])
      .then((syncResult) => {
        if (!mountedRef.current) {
          return;
        }
        const record = syncResult as Record<string, unknown>;
        setValue(parseEnforcementPreference(record[STORAGE_KEY_ENFORCED_V3]));
        setSurveyMode(
          parseV3SurveyEnabled(record[STORAGE_KEY_V3SURVEY_ENABLED]) ? "true" : "false",
        );
        const powerAppsPrefs = parsePowerAppsPreferencesFromSync(record);
        setHiddenMode(powerAppsPrefs.hidden);
        setReadOnlyMode(powerAppsPrefs.readOnly);
        setSettingsLoaded(true);
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setValue(DEFAULT_ENFORCEMENT_PREFERENCE);
        setSurveyMode("false");
        setHiddenMode(DEFAULT_POWERAPPS_HIDDEN_FIELDS);
        setReadOnlyMode(DEFAULT_POWERAPPS_READ_ONLY);
        setSettingsLoaded(true);
      });
  }, []);

  const clearPendingPowerAutomateStatusDismiss = useCallback(() => {
    if (powerAutomateStatusClearTimerRef.current !== null) {
      window.clearTimeout(powerAutomateStatusClearTimerRef.current);
      powerAutomateStatusClearTimerRef.current = null;
    }
  }, []);

  const schedulePowerAutomateStatusClear = useCallback(
    (clearAfterMs: number = 2000) => {
      clearPendingPowerAutomateStatusDismiss();
      powerAutomateStatusClearTimerRef.current = window.setTimeout(() => {
        powerAutomateStatusClearTimerRef.current = null;
        setPowerAutomateStatus("");
      }, clearAfterMs);
    },
    [clearPendingPowerAutomateStatusDismiss],
  );

  const clearPendingPowerAppsStatusDismiss = useCallback(() => {
    if (powerAppsStatusClearTimerRef.current !== null) {
      window.clearTimeout(powerAppsStatusClearTimerRef.current);
      powerAppsStatusClearTimerRef.current = null;
    }
  }, []);

  const setPowerAppsStatus = useCallback((message: string, variant?: SettingsStatusVariant) => {
    setPowerAppsStatusMessage(message);
    setPowerAppsStatusVariant(variant);
  }, []);

  const schedulePowerAppsStatusClear = useCallback(
    (clearAfterMs: number = 2000) => {
      clearPendingPowerAppsStatusDismiss();
      powerAppsStatusClearTimerRef.current = window.setTimeout(() => {
        powerAppsStatusClearTimerRef.current = null;
        setPowerAppsStatusMessage("");
        setPowerAppsStatusVariant(undefined);
      }, clearAfterMs);
    },
    [clearPendingPowerAppsStatusDismiss],
  );

  const resyncFromStorage = useCallback(async () => {
    const result = await chrome.storage.sync.get([...SYNC_POLICY_KEYS]);
    if (!mountedRef.current) {
      return;
    }
    setValue(parseEnforcementPreference(result[STORAGE_KEY_ENFORCED_V3]));
    setSurveyMode(parseV3SurveyEnabled(result[STORAGE_KEY_V3SURVEY_ENABLED]) ? "true" : "false");
  }, []);

  const onSaveTheme = useCallback(
    (next: ThemePreference) => {
      saveTheme(next);
    },
    [saveTheme],
  );

  const onSave = useCallback(
    (next: EnforcementPreference) => {
      setValue(next);
      void editorWriteQueue.enqueue(() =>
        persistPolicyPreferenceAndOptionalReload({
          storagePatch: { [STORAGE_KEY_ENFORCED_V3]: next },
          logLabel: "enforcedV3",
          getReloadPreference: () => next,
          mountedRef,
          beginSyncWrite,
          endSyncWrite,
          clearPendingStatusDismiss: clearPendingPowerAutomateStatusDismiss,
          setStatus: setPowerAutomateStatus,
          setIsTargetTabReloadBusy,
          resyncFromStorage,
          scheduleStatusClear: schedulePowerAutomateStatusClear,
          onResyncHardFailure: () => setValue(DEFAULT_ENFORCEMENT_PREFERENCE),
        }),
      );
    },
    [
      beginSyncWrite,
      clearPendingPowerAutomateStatusDismiss,
      editorWriteQueue,
      endSyncWrite,
      resyncFromStorage,
      schedulePowerAutomateStatusClear,
    ],
  );

  const onSaveSurvey = useCallback(
    (next: SurveyEnabledSync) => {
      setSurveyMode(next);
      void surveyWriteQueue.enqueue(() =>
        persistPolicyPreferenceAndOptionalReload({
          storagePatch: { [STORAGE_KEY_V3SURVEY_ENABLED]: next },
          logLabel: "v3survey",
          getReloadPreference: () => enforcementRef.current,
          mountedRef,
          beginSyncWrite,
          endSyncWrite,
          clearPendingStatusDismiss: clearPendingPowerAutomateStatusDismiss,
          setStatus: setPowerAutomateStatus,
          setIsTargetTabReloadBusy,
          resyncFromStorage,
          scheduleStatusClear: schedulePowerAutomateStatusClear,
          onResyncHardFailure: () => setSurveyMode("false"),
        }),
      );
    },
    [
      beginSyncWrite,
      clearPendingPowerAutomateStatusDismiss,
      endSyncWrite,
      resyncFromStorage,
      schedulePowerAutomateStatusClear,
      surveyWriteQueue,
    ],
  );

  useEffect(() => {
    return () => {
      clearPendingPowerAutomateStatusDismiss();
      clearPendingPowerAppsStatusDismiss();
    };
  }, [clearPendingPowerAutomateStatusDismiss, clearPendingPowerAppsStatusDismiss]);

  const powerAutomatePanelBusy = isPolicySyncBusy || isTargetTabReloadBusy;
  const powerAppsPanelBusy = isPowerAppsSyncBusy || isPowerAppsApplying;
  const showPowerAutomateNotification = shouldShowPopupTabNotification(
    activeTab,
    "power-automate",
    powerAutomateStatus,
    powerAutomatePanelBusy,
  );
  const showPowerAppsNotification = shouldShowPopupTabNotification(
    activeTab,
    "power-apps",
    powerAppsStatusMessage,
    powerAppsPanelBusy,
  );
  const powerAutomateBusyLabel = isTargetTabReloadBusy ? "Reloading tab…" : "Saving…";
  const powerAppsBusyLabel = isPowerAppsApplying ? "Applying…" : "Saving…";

  if (!loaded) {
    return (
      <div className={`${POPUP_ROOT_CLASS} text-foreground`}>
        <PopupHeader version={extensionVersion} />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className={`${POPUP_ROOT_CLASS} text-foreground`}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v === "power-automate" || v === "power-apps" || v === "about") {
            setActiveTab(v);
          }
        }}
        className="flex h-0 min-h-0 flex-1 flex-col gap-0 overflow-hidden"
      >
        <div className="flex-shrink-0">
          <PopupHeader version={extensionVersion} />
        </div>
        <TabsList className="grid h-auto w-full flex-shrink-0 grid-cols-3 gap-0.5 bg-muted p-1 text-xs">
          <TabsTrigger
            value="power-automate"
            className="flex flex-col gap-0.5 px-2 py-2 text-xs shadow-none"
          >
            <TabProductIcon product="power-automate" />
            <span>Power Automate</span>
          </TabsTrigger>
          <TabsTrigger
            value="power-apps"
            className="flex flex-col gap-0.5 px-2 py-2 text-xs shadow-none"
          >
            <TabProductIcon product="power-apps" />
            <span>Power Apps</span>
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="flex flex-col gap-0.5 px-2 py-2 text-xs shadow-none"
          >
            <BadgeInfo className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>About</span>
          </TabsTrigger>
        </TabsList>

        {showPowerAutomateNotification ? (
          <PopupNotificationRegion
            message={powerAutomateStatus}
            showSpinner={powerAutomatePanelBusy && !powerAutomateStatus}
            busyLabel={powerAutomateBusyLabel}
          />
        ) : null}
        {showPowerAppsNotification ? (
          <PopupNotificationRegion
            message={powerAppsStatusMessage}
            variant={powerAppsStatusVariant}
            showSpinner={powerAppsPanelBusy && !powerAppsStatusMessage}
            busyLabel={powerAppsBusyLabel}
          />
        ) : null}

        <div className={TAB_PANEL_HOST_CLASS}>
          <TabsContent value="power-automate" className={TAB_CONTENT_CLASS}>
            <PowerAutomatePanel
              value={value}
              surveyMode={surveyMode}
              isPolicySyncBusy={isPolicySyncBusy}
              isTargetTabReloadBusy={isTargetTabReloadBusy}
              onSave={onSave}
              onSaveSurvey={onSaveSurvey}
              hideBusyHint={powerAutomatePanelBusy}
            />
          </TabsContent>

          <TabsContent value="power-apps" className={TAB_CONTENT_CLASS}>
            <PowerAppsPanel
              hiddenMode={hiddenMode}
              readOnlyMode={readOnlyMode}
              onHiddenModeChange={setHiddenMode}
              onReadOnlyModeChange={setReadOnlyMode}
              setStatus={setPowerAppsStatus}
              clearPendingStatusDismiss={clearPendingPowerAppsStatusDismiss}
              scheduleStatusClear={schedulePowerAppsStatusClear}
              isSyncBusy={isPowerAppsSyncBusy}
              isApplying={isPowerAppsApplying}
              setIsApplying={setIsPowerAppsApplying}
              beginSyncWrite={beginPowerAppsSyncWrite}
              endSyncWrite={endPowerAppsSyncWrite}
              hideBusyHint={powerAppsPanelBusy}
            />
          </TabsContent>

          <TabsContent value="about" className={TAB_CONTENT_CLASS}>
            <AboutPanel
              extensionVersion={extensionVersion}
              themePreference={themePreference}
              themeLoaded={themeLoaded}
              onSaveTheme={onSaveTheme}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
