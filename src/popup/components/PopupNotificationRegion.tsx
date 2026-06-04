import type { SettingsStatusVariant } from "../infer-settings-status-variant";
import { POPUP_NOTIFICATION_REGION_CLASS } from "../popup-layout";
import { SettingsStatusAlert } from "./SettingsStatusAlert";

type PopupNotificationRegionProps = {
  message?: string;
  variant?: SettingsStatusVariant;
  showSpinner?: boolean;
  busyLabel?: string;
};

export function PopupNotificationRegion({
  message,
  variant,
  showSpinner,
  busyLabel = "Working…",
}: PopupNotificationRegionProps) {
  const displayMessage = message?.trim() || (showSpinner ? busyLabel : "");
  if (!displayMessage) {
    return null;
  }

  const resolvedVariant: SettingsStatusVariant | undefined =
    showSpinner && !message?.trim() ? "loading" : variant;

  return (
    <div className={POPUP_NOTIFICATION_REGION_CLASS}>
      <SettingsStatusAlert
        message={displayMessage}
        showSpinner={showSpinner}
        variant={resolvedVariant}
      />
    </div>
  );
}
