import type { ReactNode } from "react";
import {
  SETTINGS_SECTION_DESCRIPTION_CLASS,
  SETTINGS_SECTION_INTRO_CLASS,
  SETTINGS_SECTION_TITLE_CLASS,
} from "../popup-layout";
import { SettingsInfoAlert } from "./SettingsInfoAlert";

type SettingsSectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  descriptionTone?: "supporting" | "info";
  trailing?: ReactNode;
  /** Hide section busy hint when the tab notification region already shows progress. */
  hideBusyHint?: boolean;
};

/** Section title and description; optional `trailing` slot (e.g. `SettingsBusyHint`). */
export function SettingsSectionHeader({
  title,
  description,
  descriptionTone = "supporting",
  trailing,
  hideBusyHint = false,
}: SettingsSectionHeaderProps) {
  return (
    <div className={SETTINGS_SECTION_INTRO_CLASS}>
      <div className="flex min-h-[1.25rem] items-baseline justify-between gap-2">
        <h2 className={SETTINGS_SECTION_TITLE_CLASS}>{title}</h2>
        {hideBusyHint ? null : trailing}
      </div>
      {description ? (
        descriptionTone === "info" ? (
          <SettingsInfoAlert>{description}</SettingsInfoAlert>
        ) : (
          <div className={SETTINGS_SECTION_DESCRIPTION_CLASS}>{description}</div>
        )
      ) : null}
    </div>
  );
}
