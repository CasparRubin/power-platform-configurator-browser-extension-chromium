import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { RadioGroup } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import { type PowerAppsHiddenFieldsMode, type PowerAppsReadOnlyMode } from "../../constants";
import { isPowerAppsEnforcementActive } from "../../powerapps/apply-preferences";
import {
  SETTINGS_RADIO_GROUP_CLASS,
  SETTINGS_SECTION_CLASS,
  SETTINGS_SEPARATOR_CLASS,
  TAB_PANEL_BODY_CLASS,
  TAB_PANEL_CLASS,
} from "../popup-layout";
import { formatPowerAppsPreferencesApplyStatus } from "../format-powerapps-preferences";
import { persistPowerAppsPreference } from "../persist-powerapps-preference";
import { requestPowerAppsApplyPreferencesOnActiveTab } from "../powerapps-client";
import { createAsyncQueue } from "../sync-write-queue";
import { powerAppsPanelBusyMode, SettingsBusyHint } from "./SettingsBusyHint";
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

type PowerAppsPanelProps = {
  hiddenMode: PowerAppsHiddenFieldsMode;
  readOnlyMode: PowerAppsReadOnlyMode;
  onHiddenModeChange: (next: PowerAppsHiddenFieldsMode) => void;
  onReadOnlyModeChange: (next: PowerAppsReadOnlyMode) => void;
};

export function PowerAppsPanel({
  hiddenMode,
  readOnlyMode,
  onHiddenModeChange,
  onReadOnlyModeChange,
}: PowerAppsPanelProps) {
  const [isSyncBusy, setIsSyncBusy] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [status, setStatus] = useState("");
  const mountedRef = useRef(true);
  const statusClearTimerRef = useRef<number | null>(null);
  const syncWriteDepthRef = useRef(0);
  const writeQueue = useMemo(() => createAsyncQueue(), []);

  const beginSyncWrite = useCallback(() => {
    syncWriteDepthRef.current += 1;
    if (syncWriteDepthRef.current === 1) {
      setIsSyncBusy(true);
    }
  }, []);

  const endSyncWrite = useCallback(() => {
    syncWriteDepthRef.current -= 1;
    if (syncWriteDepthRef.current <= 0) {
      syncWriteDepthRef.current = 0;
      setIsSyncBusy(false);
    }
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const savePreferences = useCallback(
    (nextHidden: PowerAppsHiddenFieldsMode, nextReadOnly: PowerAppsReadOnlyMode) => {
      const prefs = { hidden: nextHidden, readOnly: nextReadOnly };
      const applyAfterSave = isPowerAppsEnforcementActive(prefs);

      void writeQueue.enqueue(() =>
        persistPowerAppsPreference({
          hidden: nextHidden,
          readOnly: nextReadOnly,
          mountedRef,
          beginSyncWrite,
          endSyncWrite,
          clearPendingStatusDismiss,
          setStatus,
          scheduleStatusClear,
          onAfterSave: applyAfterSave
            ? async () => {
                setIsApplying(true);
                try {
                  const response = await requestPowerAppsApplyPreferencesOnActiveTab();
                  if (!mountedRef.current) {
                    return;
                  }
                  setStatus(formatPowerAppsPreferencesApplyStatus(response));
                } finally {
                  if (mountedRef.current) {
                    setIsApplying(false);
                  }
                }
              }
            : undefined,
        }),
      );
    },
    [beginSyncWrite, clearPendingStatusDismiss, endSyncWrite, scheduleStatusClear, writeQueue],
  );

  const busyMode = powerAppsPanelBusyMode(isSyncBusy, isApplying);
  const panelBusy = isSyncBusy || isApplying;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={panelBusy}>
      <div className={TAB_PANEL_BODY_CLASS}>
        {status ? (
          <p
            className="text-xs leading-snug text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {panelBusy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                {status}
              </span>
            ) : (
              status
            )}
          </p>
        ) : null}

        <section className={SETTINGS_SECTION_CLASS}>
          <SettingsSectionHeader
            title="Hidden fields"
            trailing={<SettingsBusyHint mode={busyMode} />}
            description={
              <>
                On an open <span className="font-medium text-foreground">record form</span> in a
                model-driven app (Dataverse / Dynamics—commercial, China, Germany, US Gov, etc.;
                e.g. <span className="font-medium text-foreground">crm17</span> or{" "}
                <span className="font-medium text-foreground">dynamics.cn</span>).{" "}
                <span className="font-medium text-foreground">Show</span> stays on across tabs and
                record navigation until you choose Hide.{" "}
                <span className="font-medium text-foreground">Hide</span> stops auto-apply; reload
                open forms to restore platform defaults.
              </>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Hidden fields on model-driven forms"
            value={hiddenMode}
            onValueChange={(v) => {
              if (v !== "hide" && v !== "show") {
                return;
              }
              onHiddenModeChange(v);
              savePreferences(v, readOnlyMode);
            }}
          >
            <SettingsChoiceRow
              id="hidden-hide"
              value="hide"
              selected={hiddenMode === "hide"}
              label={
                <>
                  Hide hidden fields <span className="text-muted-foreground">(default)</span>
                </>
              }
              description="Stops auto-apply. Reload the form to restore what the platform hid."
            />
            <SettingsChoiceRow
              id="hidden-show"
              value="show"
              selected={hiddenMode === "show"}
              label="Show hidden fields"
              description="Reveal hidden tabs, sections, and controls on every record form you open."
            />
          </RadioGroup>
        </section>

        <Separator className={SETTINGS_SEPARATOR_CLASS} />

        <section className={SETTINGS_SECTION_CLASS}>
          <SettingsSectionHeader
            title="Read-only fields"
            trailing={<SettingsBusyHint mode={busyMode} />}
            description={
              <>
                Client-side only; does not bypass server security on save. Canvas apps are not
                supported. <span className="font-medium text-foreground">Unlock</span> stays on
                across tabs and navigation until you choose Lock.{" "}
                <span className="font-medium text-foreground">Lock</span> stops auto-apply; reload
                forms to restore read-only controls.
              </>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Read-only fields on model-driven forms"
            value={readOnlyMode}
            onValueChange={(v) => {
              if (v !== "lock" && v !== "unlock") {
                return;
              }
              onReadOnlyModeChange(v);
              savePreferences(hiddenMode, v);
            }}
          >
            <SettingsChoiceRow
              id="readonly-lock"
              value="lock"
              selected={readOnlyMode === "lock"}
              label={
                <>
                  Lock read-only <span className="text-muted-foreground">(default)</span>
                </>
              }
              description="Stops auto-apply. Reload the form to restore read-only controls."
            />
            <SettingsChoiceRow
              id="readonly-unlock"
              value="unlock"
              selected={readOnlyMode === "unlock"}
              label="Unlock read-only"
              description="Enable disabled controls on every record form you open."
            />
          </RadioGroup>
        </section>
      </div>
    </div>
  );
}
