/** Chrome extension popup maximum dimensions (content-driven sizing). */
export const POPUP_ROOT_CLASS =
  "flex h-[600px] w-[800px] max-h-[600px] max-w-[800px] flex-col gap-2 px-3 py-3 text-sm leading-snug";

/** Scrollable tab panel filling remaining popup height. */
export const TAB_PANEL_CLASS =
  "popup-tab-scroll min-h-0 flex-1 w-full overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]";
