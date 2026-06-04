/**
 * Runs `powerAppsFormActionInPage` on every frame of a tab (MAIN world) and picks the best result.
 * Used by `apply-preferences.ts` for global enforcement and by legacy popup `APPLY_FORM_ACTION` messages.
 * Surfaces `inject_no_result`, `host_not_permitted`, `injection_failed`, `framesChecked`, and `detail`
 * for the popup notification area (`powerapps-client.ts`).
 */
import type { PowerAppsFormAction, PowerAppsFormActionResult } from "./constants";
import { powerAppsFormActionInPage } from "./xrm-page-script";

function pickBestFrameResult(
  action: PowerAppsFormAction,
  frameResults: PowerAppsFormActionResult[],
  framesChecked: number,
): PowerAppsFormActionResult {
  const okResults = frameResults.filter((r) => r.ok);
  if (okResults.length === 0) {
    const noForm = frameResults.find((r) => r.error === "no_form_context");
    if (noForm) {
      return { ...noForm, framesChecked };
    }
    const noUpdate = frameResults.find((r) => r.error === "no_controls_updated");
    if (noUpdate) {
      return { ...noUpdate, framesChecked };
    }
    return (
      frameResults[0] ?? {
        ok: false,
        action,
        error: "injection_failed",
        framesChecked,
      }
    );
  }

  const best = okResults.reduce((prev, current) => {
    const bestCount = action === "unhide" ? (prev.unhidden ?? 0) : (prev.unlocked ?? 0);
    const currentCount = action === "unhide" ? (current.unhidden ?? 0) : (current.unlocked ?? 0);
    return currentCount > bestCount ? current : prev;
  });
  return { ...best, framesChecked };
}

function injectionFailure(
  action: PowerAppsFormAction,
  error: string,
  detail: string,
  framesChecked?: number,
): PowerAppsFormActionResult {
  return {
    ok: false,
    action,
    error,
    detail,
    framesChecked,
  };
}

function resolveInjectError(
  action: PowerAppsFormAction,
  lastError: string | undefined,
  framesChecked: number,
): PowerAppsFormActionResult {
  const detail =
    framesChecked === 0
      ? "No frames were injected."
      : lastError
        ? `Script did not return in ${framesChecked} frame(s): ${lastError}`
        : `Script did not return in ${framesChecked} frame(s) (check record form is open).`;

  if (
    lastError?.includes("Extension manifest must request permission") ||
    lastError?.includes("Cannot access contents of url")
  ) {
    return injectionFailure(action, "host_not_permitted", detail, framesChecked);
  }

  return injectionFailure(action, "inject_no_result", detail, framesChecked);
}

function resolveCatchError(
  action: PowerAppsFormAction,
  message: string,
  lastError: string | undefined,
): PowerAppsFormActionResult {
  const detail = lastError ? `${message} (${lastError})` : message;
  if (
    lastError?.includes("Extension manifest must request permission") ||
    lastError?.includes("Cannot access contents of url")
  ) {
    return injectionFailure(action, "host_not_permitted", detail);
  }
  return injectionFailure(action, "injection_failed", detail);
}

export async function applyPowerAppsFormActionOnTab(
  tabId: number,
  action: PowerAppsFormAction,
): Promise<PowerAppsFormActionResult> {
  if (!chrome.scripting?.executeScript) {
    return injectionFailure(action, "scripting_unavailable", "chrome.scripting is missing");
  }

  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: powerAppsFormActionInPage,
      args: [action],
    });

    const framesChecked = injections?.length ?? 0;
    const frameResults = (injections ?? [])
      .map((entry) => entry.result as PowerAppsFormActionResult | undefined)
      .filter((r): r is PowerAppsFormActionResult => r !== undefined);

    if (frameResults.length === 0) {
      return resolveInjectError(action, chrome.runtime.lastError?.message, framesChecked);
    }

    return pickBestFrameResult(action, frameResults, framesChecked);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return resolveCatchError(action, message, chrome.runtime.lastError?.message);
  }
}
