import { cn } from "@helvety/shared/utils";

/**
 * Central Tailwind class strings for the popup shell and settings UI.
 * Import these constants (and `settingsChoiceRowClass`) from panels and `App.tsx` so padding,
 * section gaps, notification region layout, and choice-card radio rows stay consistent.
 * Do not use `@helvety/extension-chrome/popup-shell` `popupChoiceRowClass` in this extension.
 */

/** Chrome extension popup maximum dimensions (content-driven sizing). */
export const POPUP_ROOT_CLASS =
  "flex h-[600px] w-[800px] max-h-[600px] max-w-[800px] min-h-0 flex-col overflow-hidden px-3 py-2.5 text-sm leading-snug";

/** Below tab bar, above scroll host; zero height when empty (conditional render). */
export const POPUP_NOTIFICATION_REGION_CLASS = "flex-shrink-0 px-2 pb-1.5 pt-0";

export const POPUP_NOTIFICATION_ALERT_CLASS = "text-xs leading-snug";

/** Fills space below tab chrome; tab panels stack here (not as flex siblings). */
export const TAB_PANEL_HOST_CLASS = "relative mt-1.5 min-h-0 flex-1 basis-0 overflow-hidden";

/** One full-size layer per tab inside {@link TAB_PANEL_HOST_CLASS}. */
export const TAB_CONTENT_CLASS =
  "absolute inset-0 flex min-h-0 flex-col overflow-hidden outline-none data-[state=inactive]:hidden";

/** Scrollable region inside an active tab (light top padding below tab bar). */
export const TAB_PANEL_CLASS =
  "popup-tab-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-1 w-full";

/** Vertical rhythm for settings tabs (Power Automate, Power Apps). */
export const TAB_PANEL_BODY_CLASS = "flex flex-col gap-4";

export const SETTINGS_SECTION_CLASS = "flex flex-col gap-3";

export const SETTINGS_SECTION_INTRO_CLASS = "flex flex-col gap-1";

export const SETTINGS_SECTION_TITLE_CLASS = "text-sm font-semibold tracking-tight text-foreground";

export const SETTINGS_SECTION_DESCRIPTION_CLASS = "text-xs leading-relaxed text-muted-foreground";

export const SETTINGS_RADIO_GROUP_CLASS = "flex flex-col gap-2";

export const SETTINGS_CHOICE_TEXT_COLUMN_CLASS = "flex min-w-0 flex-col gap-0.5";

export const SETTINGS_CHOICE_LABEL_CLASS = "text-sm font-medium leading-snug";

export const SETTINGS_CHOICE_DESCRIPTION_CLASS = "text-xs leading-relaxed text-muted-foreground";

/** Slightly larger radio control inside choice rows. */
export const SETTINGS_CHOICE_RADIO_CLASS = "mt-0.5 h-5 w-5 shrink-0";

/** Inline code in option descriptions and About copy. */
export const SETTINGS_CODE_CLASS =
  "rounded-none bg-muted px-1 py-0.5 text-[11px] leading-snug text-foreground";

export const SETTINGS_SEPARATOR_CLASS = "bg-foreground/10";

/** About tab card padding (slightly less top than legacy Card p-3). */
export const ABOUT_CARD_HEADER_CLASS = "flex flex-col gap-1 px-3 pb-2 pt-2";

export const ABOUT_CARD_CONTENT_CLASS =
  "flex flex-col gap-4 px-3 pb-3 pt-0 text-xs leading-relaxed text-muted-foreground";

export const ABOUT_DEVELOPER_LINK_CLASS =
  "flex items-center gap-2.5 rounded-sm p-2.5 transition-colors hover:bg-muted/60";

/** Radio / choice row (consistent padding; replaces package `popupChoiceRowClass` in this popup). */
export function settingsChoiceRowClass(selected: boolean): string {
  return cn(
    "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors",
    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-0",
    selected ? "border-primary/40 bg-muted" : "border-transparent hover:bg-muted/60",
  );
}
