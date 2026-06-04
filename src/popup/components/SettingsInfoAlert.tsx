import type { ReactNode } from "react";
import { cn } from "@helvety/shared/utils";
import { Info } from "lucide-react";
import { SETTINGS_SECTION_DESCRIPTION_CLASS } from "../popup-layout";
import { Alert, AlertDescription } from "./ui/alert";

type SettingsInfoAlertProps = {
  children: ReactNode;
};

export function SettingsInfoAlert({ children }: SettingsInfoAlertProps) {
  return (
    <Alert variant="info" role="note" className="items-start py-2.5">
      <Info aria-hidden />
      <AlertDescription className={cn(SETTINGS_SECTION_DESCRIPTION_CLASS, "min-w-0 flex-1 py-0")}>
        {children}
      </AlertDescription>
    </Alert>
  );
}
