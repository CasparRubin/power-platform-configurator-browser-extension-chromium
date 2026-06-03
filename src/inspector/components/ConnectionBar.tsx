import { Button } from "@helvety/ui/button";
import { cn } from "@helvety/shared/utils";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { InspectorSessionStatusMessage } from "../session-bridge";

export type InspectorView = "environments" | "flows" | "runs" | "run-detail";

type ConnectionBarProps = {
  session: InspectorSessionStatusMessage | null;
  view: InspectorView;
  breadcrumb: string;
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onSyncTab: () => void;
  onConnect: () => void;
  canGoBack: boolean;
};

export function ConnectionBar({
  session,
  view,
  breadcrumb,
  loading,
  onBack,
  onRefresh,
  onSyncTab,
  onConnect,
  canGoBack,
}: ConnectionBarProps) {
  const hasToken = session?.hasToken ?? false;
  const bridgeReady = session?.connected === true && session.bridgeTabId != null;

  return (
    <header className="shrink-0 border-b bg-card/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {canGoBack ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Flow Inspector</p>
          <p className="truncate text-[11px] text-muted-foreground">{breadcrumb}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            hasToken
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : bridgeReady
                ? "bg-sky-500/15 text-sky-800 dark:text-sky-200"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
          )}
        >
          {hasToken ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {hasToken ? "Session connected" : bridgeReady ? "Bridge connected" : "No session"}
        </span>
        {view !== "environments" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={onSyncTab}
          >
            Sync from tab
          </Button>
        ) : null}
        {!hasToken ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px]"
            onClick={onConnect}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Open Power Automate
          </Button>
        ) : null}
      </div>
      {session?.message && !hasToken ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{session.message}</p>
      ) : null}
    </header>
  );
}
