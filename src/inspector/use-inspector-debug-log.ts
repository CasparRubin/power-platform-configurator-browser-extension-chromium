import { useEffect, useState } from "react";
import {
  getInspectorDebugEntries,
  subscribeInspectorDebugLog,
  type InspectorDebugEntry,
} from "./debug-log";

export function useInspectorDebugLog(): readonly InspectorDebugEntry[] {
  const [, bump] = useState(0);
  useEffect(() => subscribeInspectorDebugLog(() => bump((n) => n + 1)), []);
  return getInspectorDebugEntries();
}
