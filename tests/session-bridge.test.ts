import { describe, expect, it } from "vitest";
import {
  INSPECTOR_MESSAGE,
  createRequestId,
  isInspectorApiRequest,
} from "../src/inspector/session-bridge";

describe("session-bridge protocol", () => {
  it("createRequestId returns unique prefixed ids", () => {
    const a = createRequestId();
    const b = createRequestId();
    expect(a).toMatch(/^req_/);
    expect(a).not.toBe(b);
  });

  it("isInspectorApiRequest validates API request messages", () => {
    expect(
      isInspectorApiRequest({
        type: INSPECTOR_MESSAGE.API_REQUEST,
        requestId: "req_1",
        url: "https://api.powerplatform.com/test",
      }),
    ).toBe(true);

    expect(isInspectorApiRequest({ type: INSPECTOR_MESSAGE.SESSION_STATUS })).toBe(false);
    expect(isInspectorApiRequest(null)).toBe(false);
  });
});
