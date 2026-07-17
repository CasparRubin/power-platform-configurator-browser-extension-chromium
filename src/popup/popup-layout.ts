import { cn } from "@helvety/shared/utils";

/**
 * Central Tailwind class strings for the popup shell and settings UI.
 * Import these constants (and `settingsChoiceRowClass`) from panels and `App.tsx` so padding,
 * section gaps, notification region layout, and choice-card radio rows stay consistent.
 * Do not use `@helvety/extension-chrome/popup-shell` `popupChoiceRowClass` in this extension.
 */

/** Fills the fixed 800 × 600 action-popup viewport defined by `index.html`. */
export const POPUP_ROOT_CLASS =
  "flex h-full min-h-0 w-full flex-col overflow-hidden px-3 py-3 text-sm leading-snug";

/** Zero-height anchor keeps transient save/apply feedback from moving panel content. */
export const POPUP_NOTIFICATION_SLOT_CLASS = "relative z-20 h-0 w-full flex-shrink-0";

export const POPUP_NOTIFICATION_REGION_CLASS = "absolute right-0 top-2 w-full max-w-md";

export const POPUP_NOTIFICATION_ALERT_CLASS = "rounded-none text-xs leading-snug";

/** Fills space below tab chrome; tab panels stack here (not as flex siblings). */
export const TAB_PANEL_HOST_CLASS = "relative mt-1.5 min-h-0 flex-1 basis-0 overflow-hidden";

/** One full-size layer per tab inside {@link TAB_PANEL_HOST_CLASS}. */
export const TAB_CONTENT_CLASS =
  "absolute inset-0 flex min-h-0 flex-col overflow-hidden outline-none data-[state=inactive]:hidden";

/** Scrollable region inside an active tab (light top padding below tab bar). */
export const TAB_PANEL_CLASS =
  "popup-tab-scroll min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-1";

/** Vertical rhythm for settings tab bodies (Power Automate, Power Apps, About). */
export const TAB_PANEL_BODY_CLASS = "mx-auto flex w-full max-w-3xl flex-col gap-5";

export const SETTINGS_SECTION_CLASS = "flex flex-col gap-3";

export const SETTINGS_SECTION_INTRO_CLASS = "flex max-w-2xl flex-col gap-1.5";

export const SETTINGS_SECTION_TITLE_CLASS = "text-sm font-semibold tracking-tight text-foreground";

export const SETTINGS_SECTION_DESCRIPTION_CLASS =
  "text-[13px] leading-relaxed text-muted-foreground";

export const SETTINGS_RADIO_GROUP_CLASS = "flex flex-col gap-2";

export const SETTINGS_CHOICE_TEXT_COLUMN_CLASS = "flex min-w-0 flex-col gap-0.5";

export const SETTINGS_CHOICE_LABEL_CLASS = "text-sm font-medium leading-snug";

export const SETTINGS_CHOICE_DESCRIPTION_CLASS = "text-xs leading-relaxed text-muted-foreground";

export const SETTINGS_CHOICE_RADIO_CLASS = "mt-0.5 h-4 w-4 shrink-0";

/** Inline code in option descriptions and About copy. */
export const SETTINGS_CODE_CLASS =
  "rounded-none bg-muted px-1 py-0.5 text-[11px] leading-snug text-foreground";

/** Bulleted explanatory copy (About “How it works”, etc.). */
export const SETTINGS_MUTED_LIST_CLASS =
  "flex max-w-2xl list-disc flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground";

/** Inline text link row (e.g. GitHub source). */
export const SETTINGS_TEXT_LINK_CLASS =
  "inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2 outline-none transition-colors hover:text-primary/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none";

/** Developer card row (no outer border; hover matches choice rows). */
export const SETTINGS_DEVELOPER_LINK_CLASS =
  "flex items-center gap-2.5 rounded-none p-2.5 outline-none transition-colors hover:bg-muted/60 active:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none";

/** Radio / choice row (consistent padding; replaces package `popupChoiceRowClass` in this popup). */
export function settingsChoiceRowClass(selected: boolean): string {
  return cn(
    "flex cursor-pointer items-start gap-3 rounded-none border p-3 transition-colors motion-reduce:transition-none",
    "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-0",
    selected
      ? "border-primary/40 bg-muted ring-1 ring-inset ring-primary/15"
      : "border-border/50 hover:border-border hover:bg-muted/60 active:bg-muted",
  );
}
