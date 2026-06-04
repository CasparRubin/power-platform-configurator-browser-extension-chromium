import { describe, expect, it } from "vitest";

import { shouldShowPopupTabNotification } from "../src/popup/popup-notification-visibility";

describe("shouldShowPopupTabNotification", () => {
  it("shows only when active tab matches the product tab", () => {
    expect(
      shouldShowPopupTabNotification("power-automate", "power-automate", "Saved.", false),
    ).toBe(true);
    expect(shouldShowPopupTabNotification("power-apps", "power-automate", "Saved.", false)).toBe(
      false,
    );
    expect(shouldShowPopupTabNotification("about", "power-automate", "Saved.", false)).toBe(false);
  });

  it("shows when busy even without a message", () => {
    expect(shouldShowPopupTabNotification("power-apps", "power-apps", "", true)).toBe(true);
    expect(shouldShowPopupTabNotification("power-apps", "power-apps", "   ", true)).toBe(true);
  });

  it("hides when inactive tab, empty message, and not busy", () => {
    expect(shouldShowPopupTabNotification("power-automate", "power-automate", "", false)).toBe(
      false,
    );
    expect(shouldShowPopupTabNotification("power-automate", "power-automate", "  ", false)).toBe(
      false,
    );
  });
});
