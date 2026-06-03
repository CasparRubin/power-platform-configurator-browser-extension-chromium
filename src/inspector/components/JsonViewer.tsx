import { Button } from "@helvety/ui/button";
import { cn } from "@helvety/shared/utils";
import { Copy, Check } from "lucide-react";
import { useCallback, useState } from "react";

export function JsonViewer({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text =
    value === null || value === undefined
      ? "—"
      : typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [text]);

  if (value === null || value === undefined) {
    return <div className={cn("text-xs text-muted-foreground", className)}>{label}: —</div>;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => void onCopy()}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 text-[10px] leading-relaxed">
        {text}
      </pre>
    </div>
  );
}
