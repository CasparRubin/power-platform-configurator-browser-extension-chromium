import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { SETTINGS_TEXT_LINK_CLASS } from "../popup-layout";

type SettingsTextLinkProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  external?: boolean;
};

export function SettingsTextLink({ href, children, icon, external = true }: SettingsTextLinkProps) {
  return (
    <a className={SETTINGS_TEXT_LINK_CLASS} href={href} target="_blank" rel="noopener noreferrer">
      {icon}
      {children}
      {external ? <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden /> : null}
    </a>
  );
}
