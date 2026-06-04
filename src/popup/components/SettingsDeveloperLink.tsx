import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { SETTINGS_DEVELOPER_LINK_CLASS } from "../popup-layout";

type SettingsDeveloperLinkProps = {
  href: string;
  children: ReactNode;
};

export function SettingsDeveloperLink({ href, children }: SettingsDeveloperLinkProps) {
  return (
    <a
      className={SETTINGS_DEVELOPER_LINK_CLASS}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
    </a>
  );
}
