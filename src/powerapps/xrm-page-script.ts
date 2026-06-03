/**
 * Self-contained function for `chrome.scripting.executeScript({ func })` in the MAIN world.
 * Logic mirrors `form-field-actions.ts` (no imports — Chrome serializes this function alone).
 */
import type { PowerAppsFormAction, PowerAppsFormActionResult } from "./constants";

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
        forEach?: (fn: (a: PageAttribute) => void) => void;
        getLength?: () => number;
        get?: (i: number) => PageAttribute;
      };
    };
  };
};

type PageTab = {
  setVisible?: (v: boolean) => void;
  sections?: {
    forEach?: (fn: (s: PageSection) => void) => void;
    getLength?: () => number;
    get?: (i: number) => PageSection;
  };
};

type PageSection = { setVisible?: (v: boolean) => void };
type PageControl = {
  setVisible?: (v: boolean) => void;
  setDisabled?: (v: boolean) => void;
};
type PageAttribute = {
  controls?: {
    forEach?: (fn: (c: PageControl) => void) => void;
    getLength?: () => number;
    get?: (i: number) => PageControl;
  };
};

type XrmLike = {
  Page?: { ui?: PageFormContext["ui"]; data?: PageFormContext["data"] };
  Utility?: {
    getGlobalContext?: () => { getFormContext?: () => PageFormContext | null };
  };
};

function pageForEachCollection<T>(
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

function pageSetVisible(target: { setVisible?: (v: boolean) => void }): number {
  if (typeof target.setVisible !== "function") {
    return 0;
  }
  target.setVisible(true);
  return 1;
}

function pageSetEnabled(target: { setDisabled?: (v: boolean) => void }): number {
  if (typeof target.setDisabled !== "function") {
    return 0;
  }
  target.setDisabled(false);
  return 1;
}

function pageUnhide(formContext: PageFormContext): number {
  let count = 0;
  pageForEachCollection(formContext.ui?.tabs, (tab) => {
    count += pageSetVisible(tab);
    pageForEachCollection(tab.sections, (section) => {
      count += pageSetVisible(section);
    });
  });
  pageForEachCollection(formContext.ui?.controls, (control) => {
    count += pageSetVisible(control);
  });
  pageForEachCollection(formContext.data?.entity?.attributes, (attr) => {
    pageForEachCollection(attr.controls, (control) => {
      count += pageSetVisible(control);
    });
  });
  return count;
}

function pageUnlock(formContext: PageFormContext): number {
  let count = 0;
  pageForEachCollection(formContext.ui?.controls, (control) => {
    count += pageSetEnabled(control);
  });
  pageForEachCollection(formContext.data?.entity?.attributes, (attr) => {
    pageForEachCollection(attr.controls, (control) => {
      count += pageSetEnabled(control);
    });
  });
  return count;
}

function pageResolveFormContext(win: Window): PageFormContext | null {
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
      if (!xrm) {
        continue;
      }
      const page = xrm.Page;
      if (page?.ui || page?.data) {
        return page as PageFormContext;
      }
      const fromUtility = xrm.Utility?.getGlobalContext?.()?.getFormContext?.();
      if (fromUtility?.ui || fromUtility?.data) {
        return fromUtility;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Runs in the portal tab MAIN world — must stay self-contained (no outer references). */
export function powerAppsFormActionInPage(action: PowerAppsFormAction): PowerAppsFormActionResult {
  const formContext = pageResolveFormContext(window);
  if (!formContext) {
    return {
      ok: false,
      action,
      error: "no_form_context",
    };
  }

  if (action === "unhide") {
    const unhidden = pageUnhide(formContext);
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

  const unlocked = pageUnlock(formContext);
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
