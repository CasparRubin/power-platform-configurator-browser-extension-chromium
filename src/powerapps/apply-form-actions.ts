import type { PowerAppsFormAction, PowerAppsFormActionResult } from "./constants";
import { powerAppsFormActionInPage } from "./xrm-page-script";

function pickBestFrameResult(
  action: PowerAppsFormAction,
  frameResults: PowerAppsFormActionResult[],
): PowerAppsFormActionResult {
  const okResults = frameResults.filter((r) => r.ok);
  if (okResults.length === 0) {
    const noForm = frameResults.find((r) => r.error === "no_form_context");
    if (noForm) {
      return noForm;
    }
    const noUpdate = frameResults.find((r) => r.error === "no_controls_updated");
    if (noUpdate) {
      return noUpdate;
    }
    return (
      frameResults[0] ?? {
        ok: false,
        action,
        error: "injection_failed",
      }
    );
  }

  return okResults.reduce((best, current) => {
    const bestCount = action === "unhide" ? (best.unhidden ?? 0) : (best.unlocked ?? 0);
    const currentCount = action === "unhide" ? (current.unhidden ?? 0) : (current.unlocked ?? 0);
    return currentCount > bestCount ? current : best;
  });
}

export async function applyPowerAppsFormActionOnTab(
  tabId: number,
  action: PowerAppsFormAction,
): Promise<PowerAppsFormActionResult> {
  if (!chrome.scripting?.executeScript) {
    return { ok: false, action, error: "scripting_unavailable" };
  }

  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: powerAppsFormActionInPage,
      args: [action],
    });

    const frameResults = (injections ?? [])
      .map((entry) => entry.result as PowerAppsFormActionResult | undefined)
      .filter((r): r is PowerAppsFormActionResult => r !== undefined);

    if (frameResults.length === 0) {
      return { ok: false, action, error: "injection_failed" };
    }

    return pickBestFrameResult(action, frameResults);
  } catch {
    return { ok: false, action, error: "injection_failed" };
  }
}
