import type { ReactNode } from "react";
import { TAB_PANEL_BODY_CLASS, TAB_PANEL_CLASS } from "../popup-layout";

type SettingsTabPanelProps = {
  children: ReactNode;
  ariaBusy?: boolean;
};

/** Scrollable settings tab shell shared by Power Automate, Power Apps, and About. */
export function SettingsTabPanel({ children, ariaBusy }: SettingsTabPanelProps) {
  return (
    <div className={TAB_PANEL_CLASS} aria-busy={ariaBusy === true ? true : undefined}>
      <div className={TAB_PANEL_BODY_CLASS}>{children}</div>
    </div>
  );
}
