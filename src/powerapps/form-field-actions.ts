/**
 * Testable Client API helpers for model-driven form unhide / unlock.
 * Injectable page script mirrors this logic — keep in sync with `xrm-page-script.ts`.
 */

export type FormControlLike = {
  setVisible?: (visible: boolean) => void;
  setDisabled?: (disabled: boolean) => void;
};

export type FormSectionLike = {
  setVisible?: (visible: boolean) => void;
};

export type FormTabLike = {
  setVisible?: (visible: boolean) => void;
  sections?: {
    forEach?: (fn: (section: FormSectionLike) => void) => void;
    get?: (index: number) => FormSectionLike;
    getLength?: () => number;
  };
};

export type FormAttributeLike = {
  controls?: {
    forEach?: (fn: (control: FormControlLike) => void) => void;
    get?: (index: number) => FormControlLike;
    getLength?: () => number;
  };
};

export type FormContextLike = {
  ui?: {
    tabs?: {
      forEach?: (fn: (tab: FormTabLike) => void) => void;
      get?: (index: number) => FormTabLike;
      getLength?: () => number;
    };
    controls?: {
      forEach?: (fn: (control: FormControlLike) => void) => void;
      get?: (index: number) => FormControlLike;
      getLength?: () => number;
    };
  };
  data?: {
    entity?: {
      attributes?: {
        forEach?: (fn: (attr: FormAttributeLike) => void) => void;
        get?: (index: number) => FormAttributeLike;
        getLength?: () => number;
      };
    };
  };
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
  const length = collection.getLength?.() ?? 0;
  for (let i = 0; i < length; i += 1) {
    const item = collection.get?.(i);
    if (item !== undefined) {
      fn(item);
    }
  }
}

function setVisibleIfPresent(target: { setVisible?: (visible: boolean) => void }): number {
  if (typeof target.setVisible !== "function") {
    return 0;
  }
  target.setVisible(true);
  return 1;
}

function setDisabledFalseIfPresent(target: { setDisabled?: (disabled: boolean) => void }): number {
  if (typeof target.setDisabled !== "function") {
    return 0;
  }
  target.setDisabled(false);
  return 1;
}

/** Show hidden tabs, sections, and controls on the form. */
export function unhideFormFields(formContext: FormContextLike): { unhidden: number } {
  let unhidden = 0;

  forEachCollection(formContext.ui?.tabs, (tab) => {
    unhidden += setVisibleIfPresent(tab);
    forEachCollection(tab.sections, (section) => {
      unhidden += setVisibleIfPresent(section);
    });
  });

  forEachCollection(formContext.ui?.controls, (control) => {
    unhidden += setVisibleIfPresent(control);
  });

  forEachCollection(formContext.data?.entity?.attributes, (attr) => {
    forEachCollection(attr.controls, (control) => {
      unhidden += setVisibleIfPresent(control);
    });
  });

  return { unhidden };
}

/** Enable disabled (read-only) controls on the form. */
export function unlockReadOnlyFields(formContext: FormContextLike): { unlocked: number } {
  let unlocked = 0;

  forEachCollection(formContext.ui?.controls, (control) => {
    unlocked += setDisabledFalseIfPresent(control);
  });

  forEachCollection(formContext.data?.entity?.attributes, (attr) => {
    forEachCollection(attr.controls, (control) => {
      unlocked += setDisabledFalseIfPresent(control);
    });
  });

  return { unlocked };
}
