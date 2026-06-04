export type SettingsBusyMode = "loading" | "saving" | "applying" | "reloading";

const MODE_LABEL: Record<SettingsBusyMode, string> = {
  loading: "Loading settings…",
  saving: "Saving…",
  applying: "Applying…",
  reloading: "Reloading tab…",
};

export function SettingsBusyHint({ mode }: { mode: SettingsBusyMode | null }) {
  if (!mode) {
    return null;
  }
  return (
    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
      {MODE_LABEL[mode]}
    </span>
  );
}

/** Power Automate policy panel: saving takes precedence over tab reload. */
export function policyPanelBusyMode(
  isPolicySyncBusy: boolean,
  isTargetTabReloadBusy: boolean,
): SettingsBusyMode | null {
  if (isPolicySyncBusy) {
    return "saving";
  }
  if (isTargetTabReloadBusy) {
    return "reloading";
  }
  return null;
}

/** Power Apps panel: saving takes precedence over apply-on-tab. */
export function powerAppsPanelBusyMode(
  isSyncBusy: boolean,
  isApplying: boolean,
): SettingsBusyMode | null {
  if (isSyncBusy) {
    return "saving";
  }
  if (isApplying) {
    return "applying";
  }
  return null;
}
