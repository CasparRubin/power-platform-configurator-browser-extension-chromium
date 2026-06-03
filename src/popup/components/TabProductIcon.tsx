import { cn } from "@helvety/shared/utils";
import powerAppsIconUrl from "../../../public/icons/Power_Apps_Scalable.svg?url";
import powerAutomateIconUrl from "../../../public/icons/Power_Automate_Scalable.svg?url";

type TabProductIconProps = {
  product: "power-automate" | "power-apps";
  className?: string;
};

const ICON_BY_PRODUCT = {
  "power-automate": powerAutomateIconUrl,
  "power-apps": powerAppsIconUrl,
} as const;

/** Microsoft product mark for popup tab triggers (bundled from `public/icons/`). */
export function TabProductIcon({ product, className }: TabProductIconProps) {
  return (
    <img
      src={ICON_BY_PRODUCT[product]}
      alt=""
      aria-hidden
      className={cn("h-3.5 w-3.5 shrink-0 object-contain", className)}
      width={14}
      height={14}
    />
  );
}
