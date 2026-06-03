/**
 * Run same-origin portal API fetches in the page MAIN world (session cookies + MSAL hooks).
 */
import { MAIN_WORLD_MESSAGE_SOURCE } from "./main-world-token-listener";

export const MAIN_WORLD_FETCH = "PP_INSPECTOR_FETCH";
export const MAIN_WORLD_FETCH_RESULT = "PP_INSPECTOR_FETCH_RESULT";

export type MainWorldFetchResult = {
  requestId: string;
  ok: boolean;
  status: number;
  bodyText: string;
  error?: string;
};

const MAIN_WORLD_FETCH_TIMEOUT_MS = 25_000;

export function fetchViaMainWorld(
  url: string,
  init?: { method?: string; headers?: Record<string, string> },
): Promise<MainWorldFetchResult> {
  const requestId = `mw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Portal fetch timed out"));
    }, MAIN_WORLD_FETCH_TIMEOUT_MS);

    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as {
        source?: string;
        type?: string;
        requestId?: string;
      };
      if (
        data?.source !== MAIN_WORLD_MESSAGE_SOURCE ||
        data.type !== MAIN_WORLD_FETCH_RESULT ||
        data.requestId !== requestId
      ) {
        return;
      }
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      resolve(event.data as MainWorldFetchResult);
    };

    window.addEventListener("message", onMessage);
    window.postMessage(
      {
        source: MAIN_WORLD_MESSAGE_SOURCE,
        type: MAIN_WORLD_FETCH,
        requestId,
        url,
        method: init?.method ?? "GET",
        headers: init?.headers ?? {},
      },
      window.location.origin,
    );
  });
}
