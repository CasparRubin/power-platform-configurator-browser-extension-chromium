import { afterEach, describe, expect, it } from "vitest";
import {
  clearInspectorDebugLog,
  formatDebugDetail,
  getInspectorDebugEntries,
  inspectorLog,
} from "../src/inspector/debug-log";

describe("inspector debug-log", () => {
  afterEach(() => {
    clearInspectorDebugLog();
  });

  it("stores entries newest-first with source and level", () => {
    inspectorLog.info("test", "hello", { ok: true });
    inspectorLog.error("test", "fail");
    const entries = getInspectorDebugEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.level).toBe("error");
    expect(entries[0]?.message).toBe("fail");
    expect(entries[1]?.source).toBe("test");
  });

  it("formatDebugDetail stringifies objects", () => {
    expect(formatDebugDetail({ a: 1 })).toContain('"a": 1');
  });
});
