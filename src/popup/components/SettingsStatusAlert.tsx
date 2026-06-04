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
      return <Loader2 className="animate-spin" aria-hidden />;
    case "success":
      return <CheckCircle2 aria-hidden />;
    case "error":
      return <CircleAlert aria-hidden />;
    default:
      return <Info aria-hidden />;
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
      role="status"
      aria-live="polite"
      className={POPUP_NOTIFICATION_ALERT_CLASS}
    >
      {showSpinner || variant === "loading" ? (
        <StatusIcon variant="loading" />
      ) : (
        <StatusIcon variant={variant} />
      )}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
