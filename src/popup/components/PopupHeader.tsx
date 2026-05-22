import { PopupHeader as PopupHeaderBase } from "@helvety/extension-chrome/popup-header";
import extensionIconUrl from "../../../assets/ppconfigurator_48.png?url";

import { EXTENSION_DISPLAY_NAME } from "../about-meta";

/** Shared popup chrome: extension icon, product name, optional version. */
export function PopupHeader({ version }: { version?: string }) {
  return (
    <PopupHeaderBase
      displayName={EXTENSION_DISPLAY_NAME}
      version={version}
      iconSrc={extensionIconUrl}
    />
  );
}
