/** Receive tokens posted from the MAIN-world hook (isolated content bridge). */

export const MAIN_WORLD_MESSAGE_SOURCE = "pp-flow-inspector";
export const MAIN_WORLD_TOKEN_TYPE = "PP_INSPECTOR_TOKEN";

export type MainWorldTokenMessage = {
  source: typeof MAIN_WORLD_MESSAGE_SOURCE;
  type: typeof MAIN_WORLD_TOKEN_TYPE;
  url: string;
  bearer: string;
};

export function isMainWorldTokenMessage(data: unknown): data is MainWorldTokenMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as MainWorldTokenMessage).source === MAIN_WORLD_MESSAGE_SOURCE &&
    (data as MainWorldTokenMessage).type === MAIN_WORLD_TOKEN_TYPE &&
    typeof (data as MainWorldTokenMessage).url === "string" &&
    typeof (data as MainWorldTokenMessage).bearer === "string"
  );
}

let mainWorldListenerInstalled = false;
let mainWorldPongReceived = false;
let mainWorldTokensCaptured = 0;

export function installMainWorldTokenListener(
  onBearer: (url: string, bearer: string) => void,
): void {
  if (mainWorldListenerInstalled) {
    return;
  }
  mainWorldListenerInstalled = true;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) {
      return;
    }
    if (event.origin !== window.location.origin) {
      return;
    }
    const data = event.data as { source?: string; type?: string; url?: string; bearer?: string };
    if (data?.source !== MAIN_WORLD_MESSAGE_SOURCE) {
      return;
    }
    if (data.type === "PP_INSPECTOR_PONG") {
      mainWorldPongReceived = true;
      return;
    }
    if (isMainWorldTokenMessage(event.data)) {
      mainWorldTokensCaptured += 1;
      onBearer(event.data.url, event.data.bearer);
    }
  });
}

export function getMainWorldDiagnostics(): {
  listenerInstalled: boolean;
  pongReceived: boolean;
  tokensCaptured: number;
} {
  return {
    listenerInstalled: mainWorldListenerInstalled,
    pongReceived: mainWorldPongReceived,
    tokensCaptured: mainWorldTokensCaptured,
  };
}

export function pingMainWorldHook(): void {
  window.postMessage(
    {
      source: MAIN_WORLD_MESSAGE_SOURCE,
      type: "PP_INSPECTOR_PING",
    },
    window.location.origin,
  );
}
