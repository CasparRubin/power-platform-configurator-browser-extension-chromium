import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeInfo,
  ExternalLink,
  GitBranch,
  Loader2,
  Package,
  Palette,
  Workflow,
} from "lucide-react";
import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import {
  ABOUT_CARD_CONTENT_CLASS,
  ABOUT_CARD_HEADER_CLASS,
  ABOUT_DEVELOPER_LINK_CLASS,
  POPUP_ROOT_CLASS,
  SETTINGS_CODE_CLASS,
  SETTINGS_RADIO_GROUP_CLASS,
  SETTINGS_SECTION_CLASS,
  SETTINGS_SEPARATOR_CLASS,
  TAB_CONTENT_CLASS,
  TAB_PANEL_CLASS,
  TAB_PANEL_HOST_CLASS,
} from "./popup-layout";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@helvety/ui/card";
import { RadioGroup } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@helvety/ui/tabs";
import {
  DEFAULT_ENFORCEMENT_PREFERENCE,
  parseEnforcementPreference,
  parseV3SurveyEnabled,
  STORAGE_KEY_ENFORCED_V3,
  STORAGE_KEY_POPUP_THEME,
  STORAGE_KEY_V3SURVEY_ENABLED,
  SYNC_POLICY_KEYS,
  type EnforcementPreference,
} from "../constants";
import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
  SOURCE_REPO_URL,
} from "./about-meta";
import { HelvetyMark } from "./components/HelvetyMark";
import { PopupHeader } from "./components/PopupHeader";
import { TabProductIcon } from "./components/TabProductIcon";
import { PowerAppsPanel } from "./components/PowerAppsPanel";
import { PowerAutomatePanel } from "./components/PowerAutomatePanel";
import { SettingsChoiceRow } from "./components/SettingsChoiceRow";
import { SettingsSectionHeader } from "./components/SettingsSectionHeader";
import { persistPolicyPreferenceAndOptionalReload } from "./persist-policy-preference";
import { createAsyncQueue } from "./sync-write-queue";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";

type SurveyEnabledSync = "true" | "false";

export default function App() {
  const [value, setValue] = useState<EnforcementPreference>(DEFAULT_ENFORCEMENT_PREFERENCE);
  const [surveyMode, setSurveyMode] = useState<SurveyEnabledSync>("false");
  const { themePreference, themeLoaded, saveTheme } = usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const loaded = themeLoaded && policyLoaded;
  const [status, setStatus] = useState<string>("");
  const [isPolicySyncBusy, setIsPolicySyncBusy] = useState(false);
  const [isTargetTabReloadBusy, setIsTargetTabReloadBusy] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string>("");
  const statusClearTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const enforcementRef = useRef<EnforcementPreference>(DEFAULT_ENFORCEMENT_PREFERENCE);
  const syncWriteDepthRef = useRef(0);
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
      .get([...SYNC_POLICY_KEYS])
      .then((syncResult) => {
        if (!mountedRef.current) {
          return;
        }
        setValue(parseEnforcementPreference(syncResult[STORAGE_KEY_ENFORCED_V3]));
        setSurveyMode(
          parseV3SurveyEnabled(syncResult[STORAGE_KEY_V3SURVEY_ENABLED]) ? "true" : "false",
        );
        setPolicyLoaded(true);
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setValue(DEFAULT_ENFORCEMENT_PREFERENCE);
        setSurveyMode("false");
        setPolicyLoaded(true);
      });
  }, []);

  const clearPendingStatusDismiss = useCallback(() => {
    if (statusClearTimerRef.current !== null) {
      window.clearTimeout(statusClearTimerRef.current);
      statusClearTimerRef.current = null;
    }
  }, []);

  const scheduleStatusClear = useCallback(
    (clearAfterMs: number = 2000) => {
      clearPendingStatusDismiss();
      statusClearTimerRef.current = window.setTimeout(() => {
        statusClearTimerRef.current = null;
        setStatus("");
      }, clearAfterMs);
    },
    [clearPendingStatusDismiss],
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
          clearPendingStatusDismiss,
          setStatus,
          setIsTargetTabReloadBusy,
          resyncFromStorage,
          scheduleStatusClear,
          onResyncHardFailure: () => setValue(DEFAULT_ENFORCEMENT_PREFERENCE),
        }),
      );
    },
    [
      beginSyncWrite,
      clearPendingStatusDismiss,
      editorWriteQueue,
      endSyncWrite,
      resyncFromStorage,
      scheduleStatusClear,
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
          clearPendingStatusDismiss,
          setStatus,
          setIsTargetTabReloadBusy,
          resyncFromStorage,
          scheduleStatusClear,
          onResyncHardFailure: () => setSurveyMode("false"),
        }),
      );
    },
    [
      beginSyncWrite,
      clearPendingStatusDismiss,
      endSyncWrite,
      resyncFromStorage,
      scheduleStatusClear,
      surveyWriteQueue,
    ],
  );

  useEffect(() => {
    return () => {
      clearPendingStatusDismiss();
    };
  }, [clearPendingStatusDismiss]);

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
        defaultValue="power-automate"
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

        {status || isPolicySyncBusy || isTargetTabReloadBusy ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-1.5 flex min-h-[1.25rem] flex-shrink-0 items-center gap-2 text-xs text-muted-foreground"
          >
            {isPolicySyncBusy || isTargetTabReloadBusy ? (
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
            {status ? <span className="min-w-0 leading-snug">{status}</span> : null}
          </div>
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
            />
          </TabsContent>

          <TabsContent value="power-apps" className={TAB_CONTENT_CLASS}>
            <PowerAppsPanel />
          </TabsContent>

          <TabsContent value="about" className={TAB_CONTENT_CLASS}>
            <div className={TAB_PANEL_CLASS}>
              <Card className="bg-transparent shadow-none">
                <CardHeader className={ABOUT_CARD_HEADER_CLASS}>
                  <CardTitle className="text-sm">{EXTENSION_DISPLAY_NAME}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Power Automate: align flow and run URLs with the classic or new designer,
                    optional <span className="font-medium text-foreground">v3survey</span>{" "}
                    Hide/Show, and pause. Power Apps: show hidden fields or unlock read-only
                    controls on model-driven record forms (client-side only).
                  </CardDescription>
                </CardHeader>
                <CardContent className={ABOUT_CARD_CONTENT_CLASS}>
                  <section className={SETTINGS_SECTION_CLASS}>
                    <SettingsSectionHeader
                      title={
                        <span className="flex items-center gap-2">
                          <Palette className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          Appearance
                        </span>
                      }
                      description="If nothing is saved yet, light or dark is chosen from your system theme. Your choice below is saved on this device only."
                    />
                    <RadioGroup
                      className={SETTINGS_RADIO_GROUP_CLASS}
                      aria-label="Popup color theme"
                      value={themePreference}
                      onValueChange={(v) => {
                        if (v === "light" || v === "dark") {
                          onSaveTheme(v);
                        }
                      }}
                    >
                      <SettingsChoiceRow
                        id="theme-light"
                        value="light"
                        selected={themePreference === "light"}
                        label="Light"
                        description="Always light."
                      />
                      <SettingsChoiceRow
                        id="theme-dark"
                        value="dark"
                        selected={themePreference === "dark"}
                        label="Dark"
                        description="Always dark."
                      />
                    </RadioGroup>
                  </section>

                  <Separator className={SETTINGS_SEPARATOR_CLASS} />

                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    How it works
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-4">
                    <li>
                      <span className="font-medium text-foreground">Power Automate</span> rewrites
                      only URLs on Power Automate hosts whose path contains{" "}
                      <code className={SETTINGS_CODE_CLASS}>/flows/</code> or{" "}
                      <code className={SETTINGS_CODE_CLASS}>/runs/</code>, and only while
                      enforcement is not paused.
                    </li>
                    <li>
                      The <span className="font-medium text-foreground">v3</span> query flag matches
                      your flow designer choice. Survey prompt settings use{" "}
                      <code className={SETTINGS_CODE_CLASS}>v3survey</code>:{" "}
                      <span className="font-medium text-foreground">Hide</span> (default) uses{" "}
                      <code className={SETTINGS_CODE_CLASS}>v3survey=false</code> on rewrites;{" "}
                      <span className="font-medium text-foreground">Show</span> only normalizes an
                      existing flag to <code className={SETTINGS_CODE_CLASS}>true</code> and never
                      adds it when absent.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">Power Apps</span> uses the Xrm
                      Client API on an open model-driven form (
                      <code className={SETTINGS_CODE_CLASS}>*.crm.dynamics.com</code>,{" "}
                      <code className={SETTINGS_CODE_CLASS}>apps.powerapps.com</code>). Canvas apps
                      are not supported.
                    </li>
                    <li>
                      Power Automate uses layered enforcement: declarative net request rules,
                      background navigation listeners, and a content script for SPA-style
                      navigations.
                    </li>
                    <li>
                      The toolbar icon shows a small badge:{" "}
                      <span className="font-medium text-foreground">C</span> for Classic or{" "}
                      <span className="font-medium text-foreground">N</span> for New Designer; the
                      badge is cleared while{" "}
                      <span className="font-medium text-foreground">Paused</span>.
                    </li>
                  </ul>
                  <p>
                    <a
                      className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-2"
                      href={SOURCE_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitBranch className="h-4 w-4 shrink-0" aria-hidden />
                      Source code on GitHub
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    </a>
                  </p>

                  <Separator className={SETTINGS_SEPARATOR_CLASS} />

                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <Package
                      className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="font-medium text-foreground">Version:</span> {extensionVersion}
                  </p>

                  <Separator className={SETTINGS_SEPARATOR_CLASS} />

                  <section
                    className="flex flex-col gap-2"
                    aria-labelledby="about-developer-heading"
                  >
                    <p id="about-developer-heading" className="text-xs font-medium text-foreground">
                      Developer
                    </p>
                    <a
                      className={ABOUT_DEVELOPER_LINK_CLASS}
                      href={DEVELOPER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <HelvetyMark className="h-7 w-7" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0">
                        <span className="text-sm font-medium text-foreground">
                          {DEVELOPER_NAME}
                        </span>
                        <span className="text-[11px] leading-tight text-muted-foreground">
                          helvety.com
                        </span>
                      </span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70"
                        aria-hidden
                      />
                    </a>
                  </section>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
