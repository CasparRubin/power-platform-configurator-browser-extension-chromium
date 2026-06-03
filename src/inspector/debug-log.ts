/** In-panel debug log for Flow Inspector (also mirrors to the side panel DevTools console). */

export type InspectorDebugLevel = "debug" | "info" | "warn" | "error";

export type InspectorDebugEntry = {
  id: string;
  at: string;
  level: InspectorDebugLevel;
  source: string;
  message: string;
  detail?: unknown;
};

const MAX_ENTRIES = 150;
const entries: InspectorDebugEntry[] = [];
const listeners = new Set<() => void>();

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function push(level: InspectorDebugLevel, source: string, message: string, detail?: unknown): void {
  const entry: InspectorDebugEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    at: formatTime(new Date()),
    level,
    source,
    message,
    detail,
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  const prefix = `[FlowInspector:${source}]`;
  if (level === "error") {
    console.error(prefix, message, detail ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, detail ?? "");
  } else if (level === "debug") {
    console.debug(prefix, message, detail ?? "");
  } else {
    console.info(prefix, message, detail ?? "");
  }

  notify();
}

export const inspectorLog = {
  debug: (source: string, message: string, detail?: unknown) =>
    push("debug", source, message, detail),
  info: (source: string, message: string, detail?: unknown) =>
    push("info", source, message, detail),
  warn: (source: string, message: string, detail?: unknown) =>
    push("warn", source, message, detail),
  error: (source: string, message: string, detail?: unknown) =>
    push("error", source, message, detail),
};

export function getInspectorDebugEntries(): readonly InspectorDebugEntry[] {
  return entries;
}

export function clearInspectorDebugLog(): void {
  entries.length = 0;
  notify();
}

export function subscribeInspectorDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function formatDebugDetail(detail: unknown): string {
  if (detail === undefined) {
    return "";
  }
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}
