import { cn } from "@helvety/shared/utils";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { InspectorRunAction } from "../flow-api";
import { JsonViewer } from "./JsonViewer";
import { StatusChip } from "./StatusChip";

type RunActionTreeProps = {
  actions: InspectorRunAction[];
  loadingAction: string | null;
  onExpandAction: (actionName: string) => Promise<void>;
};

export function RunActionTree({ actions, loadingAction, onExpandAction }: RunActionTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    (name: string) => {
      const next = !expanded[name];
      setExpanded((prev) => ({ ...prev, [name]: next }));
      if (next) {
        void onExpandAction(name);
      }
    },
    [expanded, onExpandAction],
  );

  if (actions.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">No actions in this run.</p>
    );
  }

  return (
    <ul className="divide-y">
      {actions.map((action) => {
        const isOpen = Boolean(expanded[action.name]);
        const isLoading = loadingAction === action.name;
        return (
          <li key={action.name}>
            <button
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
              onClick={() => toggle(action.name)}
            >
              <span className="mt-0.5 shrink-0 text-muted-foreground">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{action.name}</span>
                  <StatusChip status={action.status} />
                </span>
                {action.code ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {action.code}
                  </span>
                ) : null}
              </span>
              {isLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
            </button>
            {isOpen ? (
              <div className={cn("space-y-3 border-t bg-muted/20 px-3 py-3")}>
                {action.error ? <JsonViewer label="Error" value={action.error} /> : null}
                <JsonViewer label="Inputs" value={action.inputs} />
                <JsonViewer label="Outputs" value={action.outputs} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
