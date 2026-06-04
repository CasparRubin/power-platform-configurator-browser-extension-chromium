import { describe, expect, it } from "vitest";

import {
  POPUP_NOTIFICATION_ALERT_CLASS,
  POPUP_NOTIFICATION_REGION_CLASS,
  SETTINGS_CHOICE_RADIO_CLASS,
  SETTINGS_DEVELOPER_LINK_CLASS,
  SETTINGS_MUTED_LIST_CLASS,
  settingsChoiceRowClass,
} from "../src/popup/popup-layout";

describe("settingsChoiceRowClass", () => {
  it("includes shared choice-card chrome for all rows", () => {
    for (const selected of [true, false]) {
      const classes = settingsChoiceRowClass(selected);
      expect(classes).toContain("cursor-pointer");
      expect(classes).toContain("rounded-sm");
      expect(classes).toContain("border");
      expect(classes).toContain("has-[:focus-visible]:ring-2");
    }
  });

  it("highlights the selected row with primary border and muted fill", () => {
    const selected = settingsChoiceRowClass(true);
    expect(selected).toContain("border-primary/40");
    expect(selected).toContain("bg-muted");

    const unselected = settingsChoiceRowClass(false);
    expect(unselected).toContain("border-transparent");
    expect(unselected).toContain("hover:bg-muted/60");
    expect(unselected).not.toContain("border-primary/40");
  });
});

describe("SETTINGS_CHOICE_RADIO_CLASS", () => {
  it("uses a slightly larger radio control", () => {
    expect(SETTINGS_CHOICE_RADIO_CLASS).toMatch(/h-5/);
    expect(SETTINGS_CHOICE_RADIO_CLASS).toMatch(/w-5/);
  });
});

describe("popup notification layout tokens", () => {
  it("defines region and alert typography classes", () => {
    expect(POPUP_NOTIFICATION_REGION_CLASS).toContain("flex-shrink-0");
    expect(POPUP_NOTIFICATION_REGION_CLASS).toContain("w-full");
    expect(POPUP_NOTIFICATION_REGION_CLASS).toContain("pt-2");
    expect(POPUP_NOTIFICATION_REGION_CLASS).not.toContain("pt-0");
    expect(POPUP_NOTIFICATION_REGION_CLASS).not.toContain("px-2");
    expect(POPUP_NOTIFICATION_ALERT_CLASS).toContain("text-xs");
    expect(POPUP_NOTIFICATION_ALERT_CLASS).toContain("leading-snug");
  });
});

describe("About and link layout tokens", () => {
  it("exports shared list and developer link classes", () => {
    expect(SETTINGS_MUTED_LIST_CLASS).toMatch(/list-disc/);
    expect(SETTINGS_DEVELOPER_LINK_CLASS).toMatch(/hover:bg-muted/);
    expect(SETTINGS_DEVELOPER_LINK_CLASS).not.toMatch(/border/);
  });
});
