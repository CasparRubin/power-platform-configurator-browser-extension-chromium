import { EXTENSION_DISPLAY_NAME } from "../about-meta";
import { ExtensionMark } from "./ExtensionMark";

/** Shared popup chrome: extension icon, product name, optional version. */
export function PopupHeader({ version }: { version?: string }) {
  const versionLabel =
    version && version !== "—" ? (
      <span className="text-[11px] leading-tight text-muted-foreground">v{version}</span>
    ) : null;

  return (
    <header className="mb-2 flex select-none items-center gap-2.5 border-b border-border/60 pb-2">
      <ExtensionMark />
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {EXTENSION_DISPLAY_NAME}
        </span>
        {versionLabel}
      </div>
    </header>
  );
}
