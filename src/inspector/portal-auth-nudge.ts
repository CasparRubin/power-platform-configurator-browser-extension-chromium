/**
 * Ask the MAIN-world hook to run same-origin / API fetches so MSAL attaches Bearer tokens.
 */

import { MAIN_WORLD_MESSAGE_SOURCE } from "./main-world-token-listener";

function environmentIdFromLocation(): string | null {
  const match = window.location.pathname.match(/\/environments\/([^/]+)/i);
  return match?.[1] ?? null;
}

export function nudgePortalAuthViaMainWorld(): void {
  const envId = environmentIdFromLocation();
  if (!envId) {
    return;
  }

  window.postMessage(
    {
      source: MAIN_WORLD_MESSAGE_SOURCE,
      type: "PP_INSPECTOR_NUDGE",
      envId,
    },
    window.location.origin,
  );
}
