import { useCallback, useEffect, useMemo, useRef } from "react";
import { RadioGroup } from "@helvety/ui/radio-group";
import { type PowerAppsHiddenFieldsMode, type PowerAppsReadOnlyMode } from "../../constants";
import { isPowerAppsEnforcementActive } from "../../powerapps/apply-preferences";
import { SETTINGS_RADIO_GROUP_CLASS, SETTINGS_SECTION_CLASS } from "../popup-layout";
import type { SettingsStatusVariant } from "../infer-settings-status-variant";
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
  setStatus: (message: string, variant?: SettingsStatusVariant) => void;
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
                  const formatted = formatPowerAppsPreferencesApplyStatus(response);
                  setStatus(formatted.message, formatted.variant);
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
          title="Hidden form elements"
          trailing={<SettingsBusyHint mode={busyMode} />}
          hideBusyHint={hideBusyHint}
          description={
            <>
              On an open <span className="font-medium text-foreground">record form</span> in a
              model-driven app.{" "}
              <span className="font-medium text-foreground">Reveal hidden elements</span> applies on
              supported form loads and detected navigation until you choose Keep hidden.{" "}
              <span className="font-medium text-foreground">Keep hidden</span> stops automatic
              revealing; reload after an undetected same-page record change, or to restore platform
              defaults.
            </>
          }
        />

        <RadioGroup
          className={SETTINGS_RADIO_GROUP_CLASS}
          aria-label="Hidden form elements on model-driven forms"
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
                Keep hidden <span className="text-muted-foreground">(default)</span>
              </>
            }
            description="Stops automatically revealing hidden tabs, sections, and controls. Reload the page to restore platform defaults."
          />
          <SettingsChoiceRow
            id="hidden-show"
            value="show"
            selected={hiddenMode === "show"}
            label="Reveal hidden elements"
            description="Reveal hidden tabs, sections, and controls on supported model-driven record forms."
          />
        </RadioGroup>
      </section>

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title="Disabled controls"
          descriptionTone="info"
          trailing={<SettingsBusyHint mode={busyMode} />}
          hideBusyHint={hideBusyHint}
          description={
            <>
              Client-side only; does not bypass server security on save. Canvas apps are not
              supported.{" "}
              <span className="font-medium text-foreground">Enable disabled controls</span> applies
              on supported form loads and detected navigation until you choose Keep disabled.{" "}
              <span className="font-medium text-foreground">Keep disabled</span> stops automatic
              enabling; reload after an undetected same-page record change, or to restore disabled
              controls.
            </>
          }
        />

        <RadioGroup
          className={SETTINGS_RADIO_GROUP_CLASS}
          aria-label="Disabled controls on model-driven forms"
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
                Keep disabled <span className="text-muted-foreground">(default)</span>
              </>
            }
            description="Stops automatically unlocking disabled controls. Reload the page to restore platform defaults."
          />
          <SettingsChoiceRow
            id="readonly-unlock"
            value="unlock"
            selected={readOnlyMode === "unlock"}
            label="Enable disabled controls"
            description="Enable disabled controls on supported model-driven record forms."
          />
        </RadioGroup>
      </section>
    </SettingsTabPanel>
  );
}
