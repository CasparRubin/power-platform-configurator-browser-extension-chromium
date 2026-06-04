import type { ReactNode } from "react";
import {
  SETTINGS_SECTION_DESCRIPTION_CLASS,
  SETTINGS_SECTION_INTRO_CLASS,
  SETTINGS_SECTION_TITLE_CLASS,
} from "../popup-layout";

type SettingsSectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
};

/** Section title and description; optional `trailing` slot (e.g. save/reload hint). */
export function SettingsSectionHeader({
  title,
  description,
  trailing,
}: SettingsSectionHeaderProps) {
  return (
    <div className={SETTINGS_SECTION_INTRO_CLASS}>
      <div className="flex min-h-[1.25rem] items-baseline justify-between gap-2">
        <h2 className={SETTINGS_SECTION_TITLE_CLASS}>{title}</h2>
        {trailing}
      </div>
      {description ? <p className={SETTINGS_SECTION_DESCRIPTION_CLASS}>{description}</p> : null}
    </div>
  );
}
