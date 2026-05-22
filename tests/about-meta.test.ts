import { describe, expect, it } from "vitest";
import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
  SOURCE_REPO_URL,
} from "../src/popup/about-meta";

describe("about-meta", () => {
  it("exposes stable public links and display name", () => {
    expect(DEVELOPER_URL).toBe("https://helvety.com");
    expect(DEVELOPER_NAME).toBe("Helvety");
    expect(SOURCE_REPO_URL).toMatch(/^https:\/\/github\.com\//);
  });

  it("keeps official extension title and source repo URL in sync with shipped constants", () => {
    expect(EXTENSION_DISPLAY_NAME).toBe("Power Platform Configurator");
    expect(SOURCE_REPO_URL).toBe(
      "https://github.com/CasparRubin/power-platform-configurator-browser-extension-chromium",
    );
  });
});
