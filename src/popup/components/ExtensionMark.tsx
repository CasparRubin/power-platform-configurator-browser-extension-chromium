import extensionIconUrl from "../../../assets/ppconfigurator_48.png?url";
import { cn } from "@/lib/utils";

/** Extension toolbar icon (`assets/ppconfigurator_48.png`). */
export function ExtensionMark({ className }: { className?: string }) {
  return (
    <img
      src={extensionIconUrl}
      alt=""
      className={cn("h-8 w-8 shrink-0 rounded-sm", className)}
      aria-hidden
    />
  );
}
