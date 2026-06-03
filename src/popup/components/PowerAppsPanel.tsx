import { useCallback, useState } from "react";
import { Eye, Loader2, LockOpen } from "lucide-react";
import { TAB_PANEL_CLASS } from "@helvety/extension-chrome/popup-shell";
import { Button } from "@helvety/ui/button";
import type { PowerAppsFormAction } from "../../powerapps/constants";
import {
  formatPowerAppsActionError,
  formatPowerAppsActionSuccess,
  requestPowerAppsFormAction,
} from "../powerapps-client";

export function PowerAppsPanel() {
  const [busyAction, setBusyAction] = useState<PowerAppsFormAction | null>(null);
  const [status, setStatus] = useState("");

  const runAction = useCallback(async (action: PowerAppsFormAction) => {
    setBusyAction(action);
    setStatus("Applying…");
    const response = await requestPowerAppsFormAction(action);
    setBusyAction(null);
    if (response.ok) {
      setStatus(formatPowerAppsActionSuccess(action, response));
    } else {
      setStatus(formatPowerAppsActionError(response.error));
    }
  }, []);

  const busy = busyAction !== null;

  return (
    <div className={TAB_PANEL_CLASS} aria-busy={busy}>
      <div className="flex flex-col gap-3 pr-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Model-driven forms
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Works on an open <span className="font-medium text-foreground">record form</span> in a
            model-driven app (Dataverse / Dynamics). Sign in as usual. Changes are client-side only
            and do not bypass server security on save. Canvas apps are not supported.
          </p>
        </div>

        {status ? (
          <p
            className="text-xs leading-snug text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                {status}
              </span>
            ) : (
              status
            )}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            disabled={busy}
            onClick={() => void runAction("unhide")}
          >
            {busyAction === "unhide" ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Eye className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            )}
            Unhide hidden fields
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            disabled={busy}
            onClick={() => void runAction("unlock")}
          >
            {busyAction === "unlock" ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <LockOpen className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            )}
            Unlock read-only fields
          </Button>
        </div>
      </div>
    </div>
  );
}
