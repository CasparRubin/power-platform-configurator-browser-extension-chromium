/**
 * Self-contained function for `chrome.scripting.executeScript({ func })` in the MAIN world.
 * All logic must live inside `powerAppsFormActionInPage` — Chrome serializes only that function.
 */
import type { PowerAppsFormAction, PowerAppsFormActionResult } from "./constants";

/** Runs in the portal tab MAIN world — helpers are nested so injection does not lose scope. */
export function powerAppsFormActionInPage(action: PowerAppsFormAction): PowerAppsFormActionResult {
  type PageControl = {
    getVisible?: () => boolean;
    getDisabled?: () => boolean;
    setVisible?: (v: boolean) => void;
    setDisabled?: (v: boolean) => void;
  };

  type PageSection = {
    getVisible?: () => boolean;
    setVisible?: (v: boolean) => void;
    controls?: {
      forEach?: (fn: (c: PageControl) => void) => void;
      getLength?: () => number;
      get?: (i: number) => PageControl;
    };
  };

  type PageTab = {
    getVisible?: () => boolean;
    setVisible?: (v: boolean) => void;
    sections?: {
      forEach?: (fn: (s: PageSection) => void) => void;
      getLength?: () => number;
      get?: (i: number) => PageSection;
    };
  };

  type PageFormContext = {
    ui?: {
      tabs?: {
        forEach?: (fn: (tab: PageTab) => void) => void;
        getLength?: () => number;
        get?: (i: number) => PageTab;
      };
      controls?: {
        forEach?: (fn: (c: PageControl) => void) => void;
        getLength?: () => number;
        get?: (i: number) => PageControl;
      };
    };
    data?: {
      entity?: {
        attributes?: {
          forEach?: (fn: (a: { controls?: PageSection["controls"] }) => void) => void;
          getLength?: () => number;
          get?: (i: number) => { controls?: PageSection["controls"] };
        };
      };
    };
  };

  type XrmLike = {
    Page?: PageFormContext;
  };

  function forEachCollection<T>(
    collection:
      | {
          forEach?: (fn: (item: T) => void) => void;
          getLength?: () => number;
          get?: (i: number) => T;
        }
      | undefined,
    fn: (item: T) => void,
  ): void {
    if (!collection) {
      return;
    }
    if (typeof collection.forEach === "function") {
      collection.forEach(fn);
      return;
    }
    const len = collection.getLength?.() ?? 0;
    for (let i = 0; i < len; i += 1) {
      const item = collection.get?.(i);
      if (item !== undefined) {
        fn(item);
      }
    }
  }

  function isHidden(target: { getVisible?: () => boolean }): boolean {
    if (typeof target.getVisible !== "function") {
      return true;
    }
    try {
      return target.getVisible() === false;
    } catch {
      return true;
    }
  }

  function isDisabledControl(target: PageControl): boolean {
    if (typeof target.getDisabled !== "function") {
      return true;
    }
    try {
      return target.getDisabled() === true;
    } catch {
      return true;
    }
  }

  function unhideIfHidden(target: {
    getVisible?: () => boolean;
    setVisible?: (v: boolean) => void;
  }): number {
    if (typeof target.setVisible !== "function" || !isHidden(target)) {
      return 0;
    }
    target.setVisible(true);
    return 1;
  }

  function unlockIfDisabled(target: PageControl): number {
    if (typeof target.setDisabled !== "function" || !isDisabledControl(target)) {
      return 0;
    }
    target.setDisabled(false);
    return 1;
  }

  function unhideForm(formContext: PageFormContext): number {
    let count = 0;
    forEachCollection(formContext.ui?.tabs, (tab) => {
      count += unhideIfHidden(tab);
      forEachCollection(tab.sections, (section) => {
        count += unhideIfHidden(section);
        forEachCollection(section.controls, (control) => {
          count += unhideIfHidden(control);
        });
      });
    });
    forEachCollection(formContext.ui?.controls, (control) => {
      count += unhideIfHidden(control);
    });
    forEachCollection(formContext.data?.entity?.attributes, (attr) => {
      forEachCollection(attr.controls, (control) => {
        count += unhideIfHidden(control);
      });
    });
    return count;
  }

  function unlockForm(formContext: PageFormContext): number {
    let count = 0;
    forEachCollection(formContext.ui?.controls, (control) => {
      count += unlockIfDisabled(control);
    });
    forEachCollection(formContext.data?.entity?.attributes, (attr) => {
      forEachCollection(attr.controls, (control) => {
        count += unlockIfDisabled(control);
      });
    });
    forEachCollection(formContext.ui?.tabs, (tab) => {
      forEachCollection(tab.sections, (section) => {
        forEachCollection(section.controls, (control) => {
          count += unlockIfDisabled(control);
        });
      });
    });
    return count;
  }

  function resolveFormContext(win: Window): PageFormContext | null {
    const scopes: Window[] = [win];
    try {
      if (win.parent && win.parent !== win) {
        scopes.push(win.parent);
      }
      if (win.top && win.top !== win) {
        scopes.push(win.top);
      }
    } catch {
      /* cross-origin parent */
    }

    for (const scope of scopes) {
      try {
        const xrm = (scope as Window & { Xrm?: XrmLike }).Xrm;
        const page = xrm?.Page;
        if (page?.ui || page?.data) {
          return page;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  const formContext = resolveFormContext(window);
  if (!formContext) {
    return {
      ok: false,
      action,
      error: "no_form_context",
    };
  }

  if (action === "unhide") {
    const unhidden = unhideForm(formContext);
    if (unhidden === 0) {
      return {
        ok: false,
        action,
        unhidden: 0,
        error: "no_controls_updated",
      };
    }
    return { ok: true, action, unhidden };
  }

  const unlocked = unlockForm(formContext);
  if (unlocked === 0) {
    return {
      ok: false,
      action,
      unlocked: 0,
      error: "no_controls_updated",
    };
  }
  return { ok: true, action, unlocked };
}
