import { popupChoiceRowClass, TAB_PANEL_CLASS } from "@helvety/extension-chrome/popup-shell";
import { Label } from "@helvety/ui/label";
import { RadioGroup, RadioGroupItem } from "@helvety/ui/radio-group";
import { Separator } from "@helvety/ui/separator";
import type { EnforcementPreference } from "../../constants";
import { FlowInspectorLauncherCard } from "./FlowInspectorLauncherCard";
import { PolicyPanelBusyHint } from "./PolicyPanelBusyHint";

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
  const busy = isPolicySyncBusy || isTargetTabReloadBusy;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={busy}>
      <div className="flex flex-col gap-4 pr-2">
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex min-h-[1.25rem] items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Flow designer
              </h2>
              <PolicyPanelBusyHint
                isPolicySyncBusy={isPolicySyncBusy}
                isTargetTabReloadBusy={isTargetTabReloadBusy}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Choose how flow and run links open in Power Automate: classic designer, new designer,
              or paused. Paused turns off link changes until you pick a designer again.
            </p>
          </div>

          <FlowInspectorLauncherCard />

          <RadioGroup
            className="flex flex-col gap-1.5"
            aria-label="Flow designer for flow and run links"
            disabled={isPolicySyncBusy}
            value={value}
            onValueChange={(v) => {
              if (v === "true" || v === "false" || v === "off") {
                onSave(v);
              }
            }}
          >
            <div className={popupChoiceRowClass(value === "false")}>
              <RadioGroupItem value="false" id="mode-false" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0">
                <Label htmlFor="mode-false" className="cursor-pointer text-sm font-medium">
                  Classic Designer
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Rewritten links use{" "}
                  <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                    v3=false
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className={popupChoiceRowClass(value === "true")}>
              <RadioGroupItem value="true" id="mode-true" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0">
                <Label htmlFor="mode-true" className="cursor-pointer text-sm font-medium">
                  New Designer
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Rewritten links use{" "}
                  <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                    v3=true
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className={popupChoiceRowClass(value === "off")}>
              <RadioGroupItem value="off" id="mode-off" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0">
                <Label htmlFor="mode-off" className="cursor-pointer text-sm font-medium">
                  Paused
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">Pause extension</p>
              </div>
            </div>
          </RadioGroup>
        </section>

        <Separator className="bg-foreground/10" />

        <section className="flex flex-col gap-1.5">
          <div className="flex min-h-[1.25rem] items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Survey prompt (<code className="text-[11px]">v3survey</code>)
            </h2>
            <PolicyPanelBusyHint
              isPolicySyncBusy={isPolicySyncBusy}
              isTargetTabReloadBusy={isTargetTabReloadBusy}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
            <p>
              Microsoft may tie a short in-product survey to the{" "}
              <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                v3survey
              </code>{" "}
              query flag on flow and run URLs when you use the classic designer.
            </p>
            <p>
              <span className="font-medium text-foreground">Hide</span> (default) always sets{" "}
              <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                v3survey=false
              </code>{" "}
              when the extension rewrites a link.{" "}
              <span className="font-medium text-foreground">Show</span> only applies when{" "}
              <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                v3survey
              </code>{" "}
              is already on the URL: it is normalized to{" "}
              <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                v3survey=true
              </code>
              . Nothing is added if the flag is missing.
            </p>
          </div>
          <RadioGroup
            className="flex flex-col gap-1.5"
            aria-label="Survey visibility (v3survey)"
            disabled={isPolicySyncBusy}
            value={surveyMode}
            onValueChange={(v) => {
              if (v === "true" || v === "false") {
                onSaveSurvey(v);
              }
            }}
          >
            <div className={popupChoiceRowClass(surveyMode === "false")}>
              <RadioGroupItem value="false" id="survey-off" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0">
                <Label htmlFor="survey-off" className="cursor-pointer text-sm font-medium">
                  Hide <span className="text-muted-foreground">(default)</span>
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Use{" "}
                  <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                    v3survey=false
                  </code>{" "}
                  on rewrites so the survey prompt stays off.
                </p>
              </div>
            </div>
            <div className={popupChoiceRowClass(surveyMode === "true")}>
              <RadioGroupItem value="true" id="survey-on" className="mt-0.5 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0">
                <Label htmlFor="survey-on" className="cursor-pointer text-sm font-medium">
                  Show
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  If the URL already has{" "}
                  <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                    v3survey
                  </code>
                  , normalize it to{" "}
                  <code className="rounded-none bg-muted px-0.5 text-[11px] text-foreground">
                    true
                  </code>
                  . Does not add the flag when it is missing.
                </p>
              </div>
            </div>
          </RadioGroup>
        </section>
      </div>
    </div>
  );
}
