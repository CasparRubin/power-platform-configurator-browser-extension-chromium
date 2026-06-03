export function PolicyPanelBusyHint({
  isPolicySyncBusy,
  isTargetTabReloadBusy,
}: {
  isPolicySyncBusy: boolean;
  isTargetTabReloadBusy: boolean;
}) {
  if (isPolicySyncBusy) {
    return <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Saving…</span>;
  }
  if (isTargetTabReloadBusy) {
    return (
      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Reloading tab…</span>
    );
  }
  return null;
}
