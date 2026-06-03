/** Capture Bearer tokens from fetch and XMLHttpRequest on the Power Automate page. */

export type TokenCaptureHandler = (url: string, bearer: string) => void;

let xhrInterceptorInstalled = false;

export function isXhrInterceptorInstalled(): boolean {
  return xhrInterceptorInstalled;
}

export function installXhrInterceptor(onBearer: TokenCaptureHandler): void {
  if (xhrInterceptorInstalled) {
    return;
  }
  xhrInterceptorInstalled = true;

  const xhrProto = XMLHttpRequest.prototype;
  const originalOpen = xhrProto.open;
  const originalSetRequestHeader = xhrProto.setRequestHeader;
  const originalSend = xhrProto.send;

  xhrProto.open = function inspectorXhrOpen(
    this: XMLHttpRequest & { _inspectorUrl?: string; _inspectorHeaders?: Record<string, string> },
    method: string,
    url: string | URL,
    ...rest: [boolean?, string?, string?]
  ) {
    try {
      this._inspectorUrl = typeof url === "string" ? url : url.href;
      this._inspectorHeaders = {};
    } catch {
      /* ignore */
    }
    return originalOpen.apply(this, [method, url, ...rest] as Parameters<typeof originalOpen>);
  };

  xhrProto.setRequestHeader = function inspectorXhrSetHeader(
    this: XMLHttpRequest & { _inspectorUrl?: string; _inspectorHeaders?: Record<string, string> },
    name: string,
    value: string,
  ) {
    if (this._inspectorHeaders) {
      this._inspectorHeaders[name.toLowerCase()] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  xhrProto.send = function inspectorXhrSend(
    this: XMLHttpRequest & { _inspectorUrl?: string; _inspectorHeaders?: Record<string, string> },
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const url = this._inspectorUrl ?? "";
    const auth = this._inspectorHeaders?.authorization ?? this._inspectorHeaders?.Authorization;
    if (url && auth?.startsWith("Bearer ")) {
      onBearer(url, auth.slice(7));
    }

    this.addEventListener("load", () => {
      try {
        const responseUrl = this.responseURL || url;
        if (!responseUrl) {
          return;
        }
        const headerGetter = (
          this as XMLHttpRequest & { getResponseHeader?: (n: string) => string | null }
        ).getResponseHeader;
        const responseAuth = headerGetter?.call(this, "Authorization");
        if (responseAuth?.startsWith("Bearer ")) {
          onBearer(responseUrl, responseAuth.slice(7));
        }
      } catch {
        /* ignore */
      }
    });

    return originalSend.call(this, body);
  };
}
