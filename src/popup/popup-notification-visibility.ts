type SettingsProductTab = "power-automate" | "power-apps";

/** Whether the floating notification anchored below the tab bar should render for a product tab. */
export function shouldShowPopupTabNotification(
  activeTab: string,
  productTab: SettingsProductTab,
  message: string,
  busy: boolean,
): boolean {
  if (activeTab !== productTab) {
    return false;
  }
  return message.trim().length > 0 || busy;
}
