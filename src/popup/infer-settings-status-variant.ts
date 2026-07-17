/** Infer an alert variant from message text whenever the popup does not pass an explicit variant. */
export type SettingsStatusVariant = "loading" | "success" | "error" | "info";

const LOADING_PREFIXES = [
  "Saving preference",
  "Refreshing the active Power Automate",
  "Applying…",
] as const;

const SUCCESS_PATTERNS = [/^Saved\./] as const;

const ERROR_SUBSTRINGS = [
  "Could not",
  "failed",
  "not found",
  "not permitted",
  "unsupported",
  "No active",
  "No response",
  "not available",
] as const;

export function inferSettingsStatusVariant(
  message: string,
  options?: { busy?: boolean },
): SettingsStatusVariant {
  if (options?.busy) {
    return "loading";
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return "info";
  }

  for (const prefix of LOADING_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return "loading";
    }
  }

  const lower = trimmed.toLowerCase();
  for (const fragment of ERROR_SUBSTRINGS) {
    if (lower.includes(fragment.toLowerCase())) {
      return "error";
    }
  }

  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "success";
    }
  }

  if (trimmed.includes("reload")) {
    return "info";
  }

  return "info";
}
