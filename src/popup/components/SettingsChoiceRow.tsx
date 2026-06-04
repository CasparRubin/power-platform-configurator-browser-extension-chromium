import { Label } from "@helvety/ui/label";
import { RadioGroupItem } from "@helvety/ui/radio-group";
import type { ReactNode } from "react";
import {
  SETTINGS_CHOICE_DESCRIPTION_CLASS,
  SETTINGS_CHOICE_LABEL_CLASS,
  SETTINGS_CHOICE_RADIO_CLASS,
  SETTINGS_CHOICE_TEXT_COLUMN_CLASS,
  settingsChoiceRowClass,
} from "../popup-layout";

type SettingsChoiceRowProps = {
  id: string;
  value: string;
  selected: boolean;
  label: ReactNode;
  description?: ReactNode;
};

/** One radio option row; full-row Label wraps radio + text for a single click target. */
export function SettingsChoiceRow({
  id,
  value,
  selected,
  label,
  description,
}: SettingsChoiceRowProps) {
  return (
    <Label className={settingsChoiceRowClass(selected)}>
      <RadioGroupItem value={value} id={id} className={SETTINGS_CHOICE_RADIO_CLASS} />
      <div className={SETTINGS_CHOICE_TEXT_COLUMN_CLASS}>
        <span className={SETTINGS_CHOICE_LABEL_CLASS}>{label}</span>
        {description ? <p className={SETTINGS_CHOICE_DESCRIPTION_CLASS}>{description}</p> : null}
      </div>
    </Label>
  );
}
