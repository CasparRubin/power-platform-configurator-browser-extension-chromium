import { Button } from "@helvety/ui/button";
import { cn } from "@helvety/shared/utils";
import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  clearInspectorDebugLog,
  formatDebugDetail,
  type InspectorDebugEntry,
  type InspectorDebugLevel,
} from "../debug-log";
import type { InspectorSessionStatusMessage } from "../session-bridge";

type DebugLogPanelProps = {
  entries: readonly InspectorDebugEntry[];
  session: InspectorSessionStatusMessage | null;
  defaultExpanded?: boolean;
};

const LEVEL_STYLES: Record<InspectorDebugLevel, string> = {
  debug: "text-muted-foreground",
  info: "text-foreground",
  warn: "text-amber-700 dark:text-amber-300",
  error: "text-destructive",
};

function LogLine({ entry }: { entry: InspectorDebugEntry }) {
  const [showDetail, setShowDetail] = useState(false);
  const detailText = formatDebugDetail(entry.detail);

  return (
    <div className="border-b border-border/40 py-1 font-mono text-[10px] leading-snug last:border-0">
      <div className="flex gap-1.5">
        <span className="shrink-0 text-muted-foreground">{entry.at}</span>
        <span className={cn("shrink-0 uppercase", LEVEL_STYLES[entry.level])} title={entry.level}>
          {entry.level.slice(0, 1)}
        </span>
        <span className="shrink-0 text-sky-700 dark:text-sky-300">[{entry.source}]</span>
        <span className={cn("min-w-0 break-words", LEVEL_STYLES[entry.level])}>
          {entry.message}
        </span>
      </div>
      {detailText ? (
        <div className="mt-0.5 pl-[4.5rem]">
          <button
            type="button"
            className="text-[9px] text-muted-foreground underline"
            onClick={() => setShowDetail((v) => !v)}
          >
            {showDetail ? "hide detail" : "show detail"}
          </button>
          {showDetail ? (
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-1.5 text-[9px] text-muted-foreground">
              {detailText}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DebugLogPanel({ entries, session, defaultExpanded = true }: DebugLogPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const scrollRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => {
    const errors = entries.filter((e) => e.level === "error").length;
    const warns = entries.filter((e) => e.level === "warn").length;
    return { errors, warns };
  }, [entries]);

  const copyAll = async () => {
    const lines = entries.map((e) => {
      const detail = formatDebugDetail(e.detail);
      return `${e.at} ${e.level.toUpperCase()} [${e.source}] ${e.message}${detail ? `\n${detail}` : ""}`;
    });
    if (session) {
      lines.unshift(`--- session ---\n${JSON.stringify(session, null, 2)}`);
    }
    await navigator.clipboard.writeText(lines.join("\n\n"));
  };

  return (
    <section className="shrink-0 border-t bg-muted/20">
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-[10px] font-medium text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          Debug log ({entries.length})
          {summary.errors > 0 ? (
            <span className="text-destructive"> · {summary.errors} error(s)</span>
          ) : null}
          {summary.warns > 0 ? (
            <span className="text-amber-700 dark:text-amber-300"> · {summary.warns} warn</span>
          ) : null}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px]"
          onClick={() => void copyAll()}
          title="Copy log to clipboard"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px]"
          onClick={() => clearInspectorDebugLog()}
          title="Clear log"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {session?.debug ? (
        <div className="border-b px-2 py-1 font-mono text-[9px] text-muted-foreground">
          <p>
            bridge tab #{session.bridgeTabId ?? "—"}
            {session.bridgeTabUrl ? ` · ${session.bridgeTabUrl}` : ""}
          </p>
          <p>
            MSAL keys: session={session.debug.msalSessionAccessTokenKeys} local=
            {session.debug.msalLocalAccessTokenKeys}
            {session.debug.msalLocalKeysWithSecret != null
              ? ` · with secret=${session.debug.msalLocalKeysWithSecret}`
              : ""}
            {session.debug.msalLocalKeysExpired != null && session.debug.msalLocalKeysExpired > 0
              ? ` · expired=${session.debug.msalLocalKeysExpired}`
              : ""}
            {session.debug.msalLocalKeysParseFailed != null &&
            session.debug.msalLocalKeysParseFailed > 0
              ? ` · parse failed=${session.debug.msalLocalKeysParseFailed}`
              : ""}
            {session.debug.msalTokenKeyRefsResolved != null
              ? ` · refs=${session.debug.msalTokenKeyRefsResolved}`
              : ""}
            {session.debug.msalJwtHarvested != null && session.debug.msalJwtHarvested > 0
              ? ` · jwt harvest=${session.debug.msalJwtHarvested}`
              : ""}
            {session.debug.indexedDbDatabasesScanned != null
              ? ` · idb dbs=${session.debug.indexedDbDatabasesScanned}/${session.debug.indexedDbEntriesScanned ?? 0}`
              : ""}
            {session.debug.inIframe ? " · iframe" : " · top frame"}
            {session.debug.mainWorldHookPong ? " · main hook OK" : " · main hook missing"}
            {session.debug.mainWorldTokensCaptured != null &&
            session.debug.mainWorldTokensCaptured > 0
              ? ` · net tokens=${session.debug.mainWorldTokensCaptured}`
              : ""}
            {session.debug.xhrInterceptorInstalled ? " · XHR on" : ""}
            {" · "}cached audiences:{" "}
            {session.debug.cachedAudiences.length > 0
              ? session.debug.cachedAudiences.join(", ")
              : "(none)"}
          </p>
          <p className="truncate" title={session.debug.pageUrl ?? ""}>
            bridge page: {session.debug.pageUrl ?? "—"}
          </p>
        </div>
      ) : null}

      {expanded ? (
        <div ref={scrollRef} className="max-h-40 overflow-y-auto overflow-x-hidden px-2 pb-2">
          {entries.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-muted-foreground">
              No log entries yet. Refresh or load environments to trace the session bridge.
            </p>
          ) : (
            entries.map((entry) => <LogLine key={entry.id} entry={entry} />)
          )}
        </div>
      ) : null}
    </section>
  );
}
