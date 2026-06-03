import { cn } from "@helvety/shared/utils";

const TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  running: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let tone = "neutral";
  if (normalized.includes("succeed") || normalized === "success") {
    tone = "success";
  } else if (normalized.includes("fail") || normalized.includes("error")) {
    tone = "failed";
  } else if (normalized.includes("running") || normalized.includes("wait")) {
    tone = "running";
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE_CLASS[tone],
      )}
    >
      {status}
    </span>
  );
}
