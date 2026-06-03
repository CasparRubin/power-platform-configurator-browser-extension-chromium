/**
 * Runs in the page MAIN world (see manifest content_scripts world: MAIN).
 * Hooks fetch/XHR where Power Automate / MSAL attach Authorization, then notifies
 * the isolated content bridge via postMessage.
 */
(function installMainWorldTokenHook(): void {
  const globalScope = globalThis as typeof globalThis & {
    __ppInspectorMainHook?: boolean;
  };
  if (globalScope.__ppInspectorMainHook) {
    return;
  }
  globalScope.__ppInspectorMainHook = true;

  const MESSAGE_SOURCE = "pp-flow-inspector";
  const MESSAGE_TYPE = "PP_INSPECTOR_TOKEN";

  function emitToken(url: string, bearer: string): void {
    if (!url || !bearer) {
      return;
    }
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE,
        url,
        bearer,
      },
      window.location.origin,
    );
  }

  function readAuthFromHeaders(headers: HeadersInit | undefined): string | null {
    if (!headers) {
      return null;
    }
    try {
      const normalized = new Headers(headers);
      const auth = normalized.get("Authorization") ?? normalized.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        return auth.slice(7);
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function ppInspectorFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urlValue =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const bearer = readAuthFromHeaders(init?.headers);
    if (bearer) {
      emitToken(urlValue, bearer);
    }
    return originalFetch(input, init).then((response) => {
      try {
        const responseAuth = response.headers.get("Authorization");
        if (responseAuth?.startsWith("Bearer ")) {
          emitToken(urlValue, responseAuth.slice(7));
        }
      } catch {
        /* ignore */
      }
      return response;
    });
  };

  const xhrProto = XMLHttpRequest.prototype;
  const originalOpen = xhrProto.open;
  const originalSetRequestHeader = xhrProto.setRequestHeader;
  const originalSend = xhrProto.send;

  xhrProto.open = function ppInspectorXhrOpen(
    this: XMLHttpRequest & { _ppUrl?: string; _ppHeaders?: Record<string, string> },
    method: string,
    url: string | URL,
    ...rest: [boolean?, string?, string?]
  ) {
    try {
      this._ppUrl = typeof url === "string" ? url : url.href;
      this._ppHeaders = {};
    } catch {
      /* ignore */
    }
    return originalOpen.apply(this, [method, url, ...rest] as Parameters<typeof originalOpen>);
  };

  xhrProto.setRequestHeader = function ppInspectorXhrSetHeader(
    this: XMLHttpRequest & { _ppUrl?: string; _ppHeaders?: Record<string, string> },
    name: string,
    value: string,
  ) {
    if (this._ppHeaders) {
      this._ppHeaders[name.toLowerCase()] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  xhrProto.send = function ppInspectorXhrSend(
    this: XMLHttpRequest & { _ppUrl?: string; _ppHeaders?: Record<string, string> },
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const url = this._ppUrl ?? "";
    const auth = this._ppHeaders?.authorization;
    if (url && auth?.startsWith("Bearer ")) {
      emitToken(url, auth.slice(7));
    }
    return originalSend.call(this, body);
  };

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }
    const data = event.data as {
      source?: string;
      type?: string;
      envId?: string;
      requestId?: string;
      url?: string;
      method?: string;
      headers?: Record<string, string>;
    };
    if (data?.source !== MESSAGE_SOURCE) {
      return;
    }
    if (data.type === "PP_INSPECTOR_PING") {
      window.postMessage(
        { source: MESSAGE_SOURCE, type: "PP_INSPECTOR_PONG" },
        window.location.origin,
      );
      return;
    }
    if (
      data.type === "PP_INSPECTOR_FETCH" &&
      typeof data.requestId === "string" &&
      typeof data.url === "string"
    ) {
      const fetchMsg = data as {
        requestId: string;
        url: string;
        method?: string;
        headers?: Record<string, string>;
      };
      const headers = new Headers(fetchMsg.headers ?? {});
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }
      void originalFetch(fetchMsg.url, {
        method: fetchMsg.method ?? "GET",
        headers,
        credentials: "include",
      })
        .then(async (response) => {
          const bodyText = await response.text();
          window.postMessage(
            {
              source: MESSAGE_SOURCE,
              type: "PP_INSPECTOR_FETCH_RESULT",
              requestId: fetchMsg.requestId,
              ok: response.ok,
              status: response.status,
              bodyText,
            },
            window.location.origin,
          );
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          window.postMessage(
            {
              source: MESSAGE_SOURCE,
              type: "PP_INSPECTOR_FETCH_RESULT",
              requestId: fetchMsg.requestId,
              ok: false,
              status: 0,
              bodyText: "",
              error: message,
            },
            window.location.origin,
          );
        });
      return;
    }
    if (data.type === "PP_INSPECTOR_NUDGE" && typeof data.envId === "string") {
      const envId = encodeURIComponent(data.envId);
      const origin = window.location.origin;
      const probes = [
        `${origin}/providers/Microsoft.BusinessAppPlatform/environments?api-version=2020-10-01&$top=5`,
        `${origin}/providers/Microsoft.ProcessSimple/environments/${envId}/flows?api-version=2016-11-01&$top=5`,
        `https://api.bap.microsoft.com/providers/Microsoft.BusinessAppPlatform/environments?api-version=2020-10-01&$top=1`,
        `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/${envId}/flows?api-version=2016-11-01&$top=1`,
      ];
      for (const url of probes) {
        const sameOrigin = url.startsWith(origin);
        void originalFetch(url, {
          method: "GET",
          credentials: sameOrigin ? "include" : "omit",
          headers: { Accept: "application/json" },
        }).catch(() => undefined);
      }
    }
  });
})();
