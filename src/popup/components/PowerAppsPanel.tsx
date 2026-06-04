import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { RadioGroup } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import {
  DEFAULT_POWERAPPS_HIDDEN_FIELDS,
  DEFAULT_POWERAPPS_READ_ONLY,
  parsePowerAppsPreferencesFromSync,
  POWERAPPS_SYNC_KEYS,
  type PowerAppsHiddenFieldsMode,
  type PowerAppsReadOnlyMode,
} from "../../constants";
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
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function PowerAppsPanel() {
  const [hiddenMode, setHiddenMode] = useState<PowerAppsHiddenFieldsMode>(
    DEFAULT_POWERAPPS_HIDDEN_FIELDS,
  );
  const [readOnlyMode, setReadOnlyMode] = useState<PowerAppsReadOnlyMode>(
    DEFAULT_POWERAPPS_READ_ONLY,
  );
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [isSyncBusy, setIsSyncBusy] = useState(false);
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

  useEffect(() => {
    void chrome.storage.sync
      .get([...POWERAPPS_SYNC_KEYS])
      .then((result) => {
        if (!mountedRef.current) {
          return;
        }
        const prefs = parsePowerAppsPreferencesFromSync(result as Record<string, unknown>);
        setHiddenMode(prefs.hidden);
        setReadOnlyMode(prefs.readOnly);
        setPrefsLoaded(true);
      })
      .catch(() => {
        if (!mountedRef.current) {
          return;
        }
        setHiddenMode(DEFAULT_POWERAPPS_HIDDEN_FIELDS);
        setReadOnlyMode(DEFAULT_POWERAPPS_READ_ONLY);
        setPrefsLoaded(true);
      });
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
                const response = await requestPowerAppsApplyPreferencesOnActiveTab();
                if (!mountedRef.current) {
                  return;
                }
                setStatus(formatPowerAppsPreferencesApplyStatus(response));
              }
            : undefined,
        }),
      );
    },
    [beginSyncWrite, clearPendingStatusDismiss, endSyncWrite, scheduleStatusClear, writeQueue],
  );

  const busy = isSyncBusy || !prefsLoaded;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={busy}>
      <div className={TAB_PANEL_BODY_CLASS}>
        {status ? (
          <p
            className="text-xs leading-snug text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {isSyncBusy ? (
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
            disabled={busy}
            value={hiddenMode}
            onValueChange={(v) => {
              if (v !== "hide" && v !== "show") {
                return;
              }
              setHiddenMode(v);
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
            disabled={busy}
            value={readOnlyMode}
            onValueChange={(v) => {
              if (v !== "lock" && v !== "unlock") {
                return;
              }
              setReadOnlyMode(v);
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
