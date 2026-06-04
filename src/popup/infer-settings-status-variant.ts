export type SettingsStatusVariant = "loading" | "success" | "error" | "info";

const LOADING_PREFIXES = [
  "Saving preference",
  "Applying",
  "Refreshing open Power Automate",
] as const;

const SUCCESS_PATTERNS = [/^Saved\./, /^Preference saved/, /^Unhid \d+/, /^Unlocked \d+/] as const;

const ERROR_SUBSTRINGS = [
  "Could not",
  "failed",
  "not found",
  "not permitted",
  "unsupported",
  "No active",
  "No response",
  "not available",
  "Try again",
  "Check Chrome sync",
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

  if (trimmed.includes("Open a model-driven") || trimmed.includes("reload")) {
    return "info";
  }

  return "info";
}
