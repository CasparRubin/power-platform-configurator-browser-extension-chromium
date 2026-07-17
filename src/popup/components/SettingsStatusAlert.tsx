import { cn } from "@helvety/shared/utils";
import { CheckCircle2, CircleAlert, Info, Loader2 } from "lucide-react";
import {
  inferSettingsStatusVariant,
  type SettingsStatusVariant,
} from "../infer-settings-status-variant";
import { POPUP_NOTIFICATION_ALERT_CLASS } from "../popup-layout";
import { Alert, AlertDescription } from "./ui/alert";

type SettingsStatusAlertProps = {
  message: string;
  variant?: SettingsStatusVariant;
  showSpinner?: boolean;
};

function StatusIcon({ variant }: { variant: SettingsStatusVariant }) {
  switch (variant) {
    case "loading":
      return <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />;
    case "success":
      return <CheckCircle2 className="h-4 w-4" aria-hidden />;
    case "error":
      return <CircleAlert className="h-4 w-4" aria-hidden />;
    case "info":
      return <Info className="h-4 w-4" aria-hidden />;
    default: {
      const exhaustiveVariant: never = variant;
      return exhaustiveVariant;
    }
  }
}

export function SettingsStatusAlert({
  message,
  variant: variantProp,
  showSpinner,
}: SettingsStatusAlertProps) {
  const variant = variantProp ?? inferSettingsStatusVariant(message);
  const alertVariant =
    variant === "loading" ? "loading" : variant === "error" ? "destructive" : variant;

  return (
    <Alert
      variant={alertVariant}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(POPUP_NOTIFICATION_ALERT_CLASS, "items-center")}
    >
      {showSpinner || variant === "loading" ? (
        <StatusIcon variant="loading" />
      ) : (
        <StatusIcon variant={variant} />
      )}
      <AlertDescription className="min-w-0 flex-1 py-0 leading-snug">{message}</AlertDescription>
    </Alert>
  );
}
