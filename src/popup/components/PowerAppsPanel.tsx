import { useCallback, useEffect, useMemo, useRef } from "react";
import { RadioGroup } from "@helvety/ui/radio-group";
import { type PowerAppsHiddenFieldsMode, type PowerAppsReadOnlyMode } from "../../constants";
import { isPowerAppsEnforcementActive } from "../../powerapps/apply-preferences";
import { SETTINGS_RADIO_GROUP_CLASS, SETTINGS_SECTION_CLASS } from "../popup-layout";
import { formatPowerAppsPreferencesApplyStatus } from "../format-powerapps-preferences";
import { persistPowerAppsPreference } from "../persist-powerapps-preference";
import { requestPowerAppsApplyPreferencesOnActiveTab } from "../powerapps-client";
import { createAsyncQueue } from "../sync-write-queue";
import { powerAppsPanelBusyMode, SettingsBusyHint } from "./SettingsBusyHint";
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { SettingsTabPanel } from "./SettingsTabPanel";

type PowerAppsPanelProps = {
  hiddenMode: PowerAppsHiddenFieldsMode;
  readOnlyMode: PowerAppsReadOnlyMode;
  onHiddenModeChange: (next: PowerAppsHiddenFieldsMode) => void;
  onReadOnlyModeChange: (next: PowerAppsReadOnlyMode) => void;
  setStatus: (message: string) => void;
  clearPendingStatusDismiss: () => void;
  scheduleStatusClear: (clearAfterMs?: number) => void;
  isSyncBusy: boolean;
  isApplying: boolean;
  setIsApplying: (busy: boolean) => void;
  beginSyncWrite: () => void;
  endSyncWrite: () => void;
  hideBusyHint?: boolean;
};

export function PowerAppsPanel({
  hiddenMode,
  readOnlyMode,
  onHiddenModeChange,
  onReadOnlyModeChange,
  setStatus,
  clearPendingStatusDismiss,
  scheduleStatusClear,
  isSyncBusy,
  isApplying,
  setIsApplying,
  beginSyncWrite,
  endSyncWrite,
  hideBusyHint = false,
}: PowerAppsPanelProps) {
  const mountedRef = useRef(true);
  const writeQueue = useMemo(() => createAsyncQueue(), []);

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
    [
      beginSyncWrite,
      clearPendingStatusDismiss,
      endSyncWrite,
      scheduleStatusClear,
      setIsApplying,
      setStatus,
      writeQueue,
    ],
  );

  const busyMode = powerAppsPanelBusyMode(isSyncBusy, isApplying);
  const panelBusy = isSyncBusy || isApplying;

  return (
    <SettingsTabPanel ariaBusy={panelBusy}>
      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title="Hidden fields"
          trailing={<SettingsBusyHint mode={busyMode} />}
          hideBusyHint={hideBusyHint}
          description={
            <>
              On an open <span className="font-medium text-foreground">record form</span> in a
              model-driven app. <span className="font-medium text-foreground">Show</span> stays on
              across tabs and record navigation until you choose Hide.{" "}
              <span className="font-medium text-foreground">Hide</span> stops auto-apply; reload the
              page on open record forms to restore platform defaults.
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
            description="Stops auto-apply. Reload the page to restore what the platform hid."
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

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title="Read-only fields"
          trailing={<SettingsBusyHint mode={busyMode} />}
          hideBusyHint={hideBusyHint}
          description={
            <>
              Client-side only; does not bypass server security on save. Canvas apps are not
              supported. <span className="font-medium text-foreground">Unlock</span> stays on across
              tabs and navigation until you choose Lock.{" "}
              <span className="font-medium text-foreground">Lock</span> stops auto-apply; reload the
              page on open record forms to restore read-only controls.
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
            description="Stops auto-apply. Reload the page to restore read-only controls."
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
    </SettingsTabPanel>
  );
}
