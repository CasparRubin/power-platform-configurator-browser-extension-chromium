import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { SETTINGS_SECTION_DESCRIPTION_CLASS } from "../popup-layout";
import { Alert, AlertDescription } from "./ui/alert";

type SettingsInfoAlertProps = {
  children: ReactNode;
};

export function SettingsInfoAlert({ children }: SettingsInfoAlertProps) {
  return (
    <Alert variant="info" role="note">
      <Info aria-hidden />
      <AlertDescription className={SETTINGS_SECTION_DESCRIPTION_CLASS}>{children}</AlertDescription>
    </Alert>
  );
}
