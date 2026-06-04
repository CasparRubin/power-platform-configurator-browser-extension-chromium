import { POPUP_NOTIFICATION_REGION_CLASS } from "../popup-layout";
import { SettingsStatusAlert } from "./SettingsStatusAlert";

type PopupNotificationRegionProps = {
  message?: string;
  showSpinner?: boolean;
  busyLabel?: string;
};

export function PopupNotificationRegion({
  message,
  showSpinner,
  busyLabel = "Working…",
}: PopupNotificationRegionProps) {
  const displayMessage = message?.trim() || (showSpinner ? busyLabel : "");
  if (!displayMessage) {
    return null;
  }

  return (
    <div className={POPUP_NOTIFICATION_REGION_CLASS}>
      <SettingsStatusAlert
        message={displayMessage}
        showSpinner={showSpinner}
        variant={showSpinner && !message?.trim() ? "loading" : undefined}
      />
    </div>
  );
}
