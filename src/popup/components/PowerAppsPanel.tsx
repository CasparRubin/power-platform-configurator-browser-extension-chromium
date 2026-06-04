import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { RadioGroup } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import type { PowerAppsFormAction } from "../../powerapps/constants";
import {
  SETTINGS_RADIO_GROUP_CLASS,
  SETTINGS_SECTION_CLASS,
  SETTINGS_SEPARATOR_CLASS,
  TAB_PANEL_BODY_CLASS,
  TAB_PANEL_CLASS,
} from "../popup-layout";
import {
  formatPowerAppsActionError,
  formatPowerAppsActionSuccess,
  requestPowerAppsFormAction,
} from "../powerapps-client";
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

type HiddenFieldsMode = "hide" | "show";
type ReadOnlyMode = "lock" | "unlock";

export function PowerAppsPanel() {
  const [hiddenMode, setHiddenMode] = useState<HiddenFieldsMode>("hide");
  const [readOnlyMode, setReadOnlyMode] = useState<ReadOnlyMode>("lock");
  const [busyAction, setBusyAction] = useState<PowerAppsFormAction | null>(null);
  const [status, setStatus] = useState("");

  const runAction = useCallback(async (action: PowerAppsFormAction) => {
    setBusyAction(action);
    setStatus("Applying…");
    const response = await requestPowerAppsFormAction(action);
    setBusyAction(null);
    if (response.ok) {
      setStatus(formatPowerAppsActionSuccess(action, response));
    } else {
      setStatus(formatPowerAppsActionError(response.error));
    }
  }, []);

  const busy = busyAction !== null;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={busy}>
      <div className={TAB_PANEL_BODY_CLASS}>
        {status ? (
          <p
            className="text-xs leading-snug text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {busy ? (
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
                model-driven app (Dataverse / Dynamics).{" "}
                <span className="font-medium text-foreground">Show</span> reveals hidden tabs,
                sections, and controls client-side.{" "}
                <span className="font-medium text-foreground">Hide</span> leaves the form as opened;
                reload the page to restore platform defaults.
              </>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Hidden fields on model-driven forms"
            disabled={busy}
            value={hiddenMode}
            onValueChange={(v) => {
              if (v === "hide") {
                setHiddenMode("hide");
                return;
              }
              if (v === "show") {
                setHiddenMode("show");
                void runAction("unhide");
              }
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
              description="No change. Reload the form to restore what the platform hid."
            />
            <SettingsChoiceRow
              id="hidden-show"
              value="show"
              selected={hiddenMode === "show"}
              label="Show hidden fields"
              description="Unhide hidden tabs, sections, and controls on the current form."
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
                supported. <span className="font-medium text-foreground">Unlock</span> enables
                disabled controls. <span className="font-medium text-foreground">Lock</span> leaves
                read-only as opened; reload to restore.
              </>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Read-only fields on model-driven forms"
            disabled={busy}
            value={readOnlyMode}
            onValueChange={(v) => {
              if (v === "lock") {
                setReadOnlyMode("lock");
                return;
              }
              if (v === "unlock") {
                setReadOnlyMode("unlock");
                void runAction("unlock");
              }
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
              description="No change. Reload the form to restore read-only controls."
            />
            <SettingsChoiceRow
              id="readonly-unlock"
              value="unlock"
              selected={readOnlyMode === "unlock"}
              label="Unlock read-only"
              description="Enable disabled controls on the current form."
            />
          </RadioGroup>
        </section>
      </div>
    </div>
  );
}
