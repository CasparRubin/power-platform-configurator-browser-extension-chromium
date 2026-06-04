import type { ReactNode } from "react";
import { SETTINGS_MUTED_LIST_CLASS } from "../popup-layout";

type SettingsMutedListProps = {
  children: ReactNode;
};

export function SettingsMutedList({ children }: SettingsMutedListProps) {
  return <ul className={SETTINGS_MUTED_LIST_CLASS}>{children}</ul>;
}
