import { RadioGroup } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import type { EnforcementPreference } from "../../constants";
import {
  SETTINGS_CODE_CLASS,
  SETTINGS_RADIO_GROUP_CLASS,
  SETTINGS_SECTION_CLASS,
  SETTINGS_SEPARATOR_CLASS,
  TAB_PANEL_BODY_CLASS,
  TAB_PANEL_CLASS,
} from "../popup-layout";
import { policyPanelBusyMode, SettingsBusyHint } from "./SettingsBusyHint";
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

type SurveyEnabledSync = "true" | "false";

type PowerAutomatePanelProps = {
  value: EnforcementPreference;
  surveyMode: SurveyEnabledSync;
  isPolicySyncBusy: boolean;
  isTargetTabReloadBusy: boolean;
  onSave: (next: EnforcementPreference) => void;
  onSaveSurvey: (next: SurveyEnabledSync) => void;
};

export function PowerAutomatePanel({
  value,
  surveyMode,
  isPolicySyncBusy,
  isTargetTabReloadBusy,
  onSave,
  onSaveSurvey,
}: PowerAutomatePanelProps) {
  const busyMode = policyPanelBusyMode(isPolicySyncBusy, isTargetTabReloadBusy);
  const panelBusy = isPolicySyncBusy || isTargetTabReloadBusy;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={panelBusy}>
      <div className={TAB_PANEL_BODY_CLASS}>
        <section className={SETTINGS_SECTION_CLASS}>
          <SettingsSectionHeader
            title="Flow designer"
            trailing={<SettingsBusyHint mode={busyMode} />}
            description={
              <>
                Choose how flow and run links open in Power Automate: classic designer, new
                designer, or paused. Paused turns off link changes until you pick a designer again.
              </>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Flow designer for flow and run links"
            value={value}
            onValueChange={(v) => {
              if (v === "true" || v === "false" || v === "off") {
                onSave(v);
              }
            }}
          >
            <SettingsChoiceRow
              id="mode-false"
              value="false"
              selected={value === "false"}
              label="Classic Designer"
              description={
                <>
                  Rewritten links use <code className={SETTINGS_CODE_CLASS}>v3=false</code>.
                </>
              }
            />
            <SettingsChoiceRow
              id="mode-true"
              value="true"
              selected={value === "true"}
              label="New Designer"
              description={
                <>
                  Rewritten links use <code className={SETTINGS_CODE_CLASS}>v3=true</code>.
                </>
              }
            />
            <SettingsChoiceRow
              id="mode-off"
              value="off"
              selected={value === "off"}
              label="Paused"
              description="Pause extension"
            />
          </RadioGroup>
        </section>

        <Separator className={SETTINGS_SEPARATOR_CLASS} />

        <section className={SETTINGS_SECTION_CLASS}>
          <SettingsSectionHeader
            title={
              <>
                Survey prompt (<code className={SETTINGS_CODE_CLASS}>v3survey</code>)
              </>
            }
            trailing={<SettingsBusyHint mode={busyMode} />}
            description={
              <span className="flex flex-col gap-1">
                <span>
                  Microsoft may tie a short in-product survey to the{" "}
                  <code className={SETTINGS_CODE_CLASS}>v3survey</code> query flag on flow and run
                  URLs when you use the classic designer.
                </span>
                <span>
                  <span className="font-medium text-foreground">Hide</span> (default) always sets{" "}
                  <code className={SETTINGS_CODE_CLASS}>v3survey=false</code> when the extension
                  rewrites a link. <span className="font-medium text-foreground">Show</span> only
                  applies when <code className={SETTINGS_CODE_CLASS}>v3survey</code> is already on
                  the URL: it is normalized to{" "}
                  <code className={SETTINGS_CODE_CLASS}>v3survey=true</code>. Nothing is added if
                  the flag is missing.
                </span>
              </span>
            }
          />

          <RadioGroup
            className={SETTINGS_RADIO_GROUP_CLASS}
            aria-label="Survey visibility (v3survey)"
            value={surveyMode}
            onValueChange={(v) => {
              if (v === "true" || v === "false") {
                onSaveSurvey(v);
              }
            }}
          >
            <SettingsChoiceRow
              id="survey-off"
              value="false"
              selected={surveyMode === "false"}
              label={
                <>
                  Hide <span className="text-muted-foreground">(default)</span>
                </>
              }
              description={
                <>
                  Use <code className={SETTINGS_CODE_CLASS}>v3survey=false</code> on rewrites so the
                  survey prompt stays off.
                </>
              }
            />
            <SettingsChoiceRow
              id="survey-on"
              value="true"
              selected={surveyMode === "true"}
              label="Show"
              description={
                <>
                  If the URL already has <code className={SETTINGS_CODE_CLASS}>v3survey</code>,
                  normalize it to <code className={SETTINGS_CODE_CLASS}>true</code>. Does not add
                  the flag when it is missing.
                </>
              }
            />
          </RadioGroup>
        </section>
      </div>
    </div>
  );
}
