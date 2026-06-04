import { afterEach, describe, expect, it, vi } from "vitest";

import { powerAppsFormActionInPage } from "../src/powerapps/xrm-page-script";

/** Retired module-level helpers — must not appear as calls in the serialized inject function. */
const RETIRED_MODULE_HELPER_NAMES = [
  "pageResolveFormContext",
  "pageUnhide",
  "pageUnlock",
  "pageForEachCollection",
  "pageSetVisible",
  "pageSetEnabled",
];

type MockControl = {
  getVisible?: () => boolean;
  getDisabled?: () => boolean;
  setVisible?: (visible: boolean) => void;
  setDisabled?: (disabled: boolean) => void;
  sections?: MockSectionCollection;
};

type MockSection = MockControl & {
  controls?: MockControlCollection;
};

type MockSectionCollection = {
  forEach?: (fn: (section: MockSection) => void) => void;
  getLength?: () => number;
  get?: (index: number) => MockSection | undefined;
};

type MockControlCollection = {
  forEach?: (fn: (control: MockControl) => void) => void;
  getLength?: () => number;
  get?: (index: number) => MockControl | undefined;
};

type MockTabCollection = {
  forEach?: (fn: (tab: MockSection) => void) => void;
  getLength?: () => number;
  get?: (index: number) => MockSection | undefined;
};

type MockAttribute = {
  controls?: MockControlCollection;
};

type MockAttributeCollection = {
  forEach?: (fn: (attr: MockAttribute) => void) => void;
  getLength?: () => number;
  get?: (index: number) => MockAttribute | undefined;
};

type MockFormContext = {
  ui?: {
    tabs?: MockTabCollection;
    controls?: MockControlCollection;
  };
  data?: {
    entity?: {
      attributes?: MockAttributeCollection;
    };
  };
};

type XrmGlobal = { Xrm?: { Page?: MockFormContext }; window?: XrmGlobal };

function withMockXrmPage(page: MockFormContext | undefined, run: () => void): void {
  const global = globalThis as unknown as XrmGlobal;
  const previousXrm = global.Xrm;
  const previousWindow = global.window;
  if (page === undefined) {
    delete global.Xrm;
  } else {
    global.Xrm = { Page: page };
  }
  global.window = global;
  try {
    run();
  } finally {
    if (previousXrm === undefined) {
      delete global.Xrm;
    } else {
      global.Xrm = previousXrm;
    }
    if (previousWindow === undefined) {
      delete global.window;
    } else {
      global.window = previousWindow;
    }
  }
}

afterEach(() => {
  const global = globalThis as unknown as XrmGlobal;
  delete global.Xrm;
  delete global.window;
});

function mockControl(overrides: MockControl): MockControl {
  return overrides;
}

describe("powerAppsFormActionInPage inject safety", () => {
  it("does not reference retired module-level helper identifiers", () => {
    const source = powerAppsFormActionInPage.toString();
    for (const name of RETIRED_MODULE_HELPER_NAMES) {
      expect(source).not.toContain(`${name}(`);
    }
  });

  it("does not use undocumented getGlobalContext().getFormContext()", () => {
    const source = powerAppsFormActionInPage.toString();
    expect(source).not.toMatch(/getGlobalContext\s*\(\s*\)\s*\.?\s*getFormContext/);
  });

  it("defines nested resolve and form-walk logic inside the function", () => {
    const source = powerAppsFormActionInPage.toString();
    expect(source).toContain("resolveFormContext");
    expect(source).toContain("unhideIfHidden");
    expect(source).toContain("unlockIfDisabled");
    expect(source).toContain("Xrm");
  });
});

describe("powerAppsFormActionInPage form context resolution", () => {
  it("resolves Xrm.Page from parent when the iframe window has no context", () => {
    const setVisible = vi.fn();
    const formContext: MockFormContext = {
      ui: {
        controls: {
          forEach(fn) {
            fn({ getVisible: () => false, setVisible });
          },
        },
      },
    };
    const parentScope = { Xrm: { Page: formContext } };
    const iframeWindow = { parent: parentScope, top: parentScope };

    const global = globalThis as unknown as XrmGlobal;
    delete global.Xrm;
    global.window = iframeWindow as unknown as XrmGlobal;

    try {
      expect(powerAppsFormActionInPage("unhide")).toEqual({
        ok: true,
        action: "unhide",
        unhidden: 1,
      });
    } finally {
      delete global.window;
    }
  });

  it("returns no_form_context when parent access throws (cross-origin)", () => {
    const iframeWindow = {
      get parent() {
        throw new Error("cross-origin");
      },
      get top() {
        throw new Error("cross-origin");
      },
    };

    const global = globalThis as unknown as XrmGlobal;
    delete global.Xrm;
    global.window = iframeWindow as unknown as XrmGlobal;

    try {
      expect(powerAppsFormActionInPage("unhide")).toEqual({
        ok: false,
        action: "unhide",
        error: "no_form_context",
      });
    } finally {
      delete global.window;
    }
  });
});

describe("powerAppsFormActionInPage unhide", () => {
  it("returns no_form_context when Xrm.Page is missing", () => {
    withMockXrmPage(undefined, () => {
      expect(powerAppsFormActionInPage("unhide")).toEqual({
        ok: false,
        action: "unhide",
        error: "no_form_context",
      });
    });
  });

  it("shows hidden tabs, sections, and controls", () => {
    const tabVisible = vi.fn();
    const sectionVisible = vi.fn();
    const controlVisible = vi.fn();

    withMockXrmPage(
      {
        ui: {
          tabs: {
            forEach(fn) {
              fn({
                getVisible: () => false,
                setVisible: tabVisible,
                sections: {
                  forEach(sfn) {
                    sfn({
                      getVisible: () => false,
                      setVisible: sectionVisible,
                    });
                  },
                },
              });
            },
          },
          controls: {
            forEach(fn) {
              fn({
                getVisible: () => false,
                setVisible: controlVisible,
              });
            },
          },
        },
      },
      () => {
        const result = powerAppsFormActionInPage("unhide");
        expect(result).toEqual({ ok: true, action: "unhide", unhidden: 3 });
        expect(tabVisible).toHaveBeenCalledWith(true);
        expect(sectionVisible).toHaveBeenCalledWith(true);
        expect(controlVisible).toHaveBeenCalledWith(true);
      },
    );
  });

  it("unhides controls in section.controls collection", () => {
    const sectionControlVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          tabs: {
            forEach(fn) {
              fn({
                getVisible: () => true,
                sections: {
                  forEach(sfn) {
                    sfn({
                      getVisible: () => true,
                      controls: {
                        forEach(cfn) {
                          cfn({
                            getVisible: () => false,
                            setVisible: sectionControlVisible,
                          });
                        },
                      },
                    });
                  },
                },
              });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 1,
        });
        expect(sectionControlVisible).toHaveBeenCalledWith(true);
      },
    );
  });

  it("unhides when getVisible is missing but setVisible exists", () => {
    const setVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({ setVisible });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 1,
        });
        expect(setVisible).toHaveBeenCalledWith(true);
      },
    );
  });

  it("unhides when getVisible throws", () => {
    const setVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({
                getVisible: () => {
                  throw new Error("crm");
                },
                setVisible,
              });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 1,
        });
      },
    );
  });

  it("returns no_controls_updated when elements are already visible", () => {
    const setVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({
                getVisible: () => true,
                setVisible,
              });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: false,
          action: "unhide",
          unhidden: 0,
          error: "no_controls_updated",
        });
        expect(setVisible).not.toHaveBeenCalled();
      },
    );
  });

  it("supports collections exposed via getLength/get only", () => {
    const controlVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            getLength: () => 1,
            get: (i: number) =>
              i === 0 ? { getVisible: () => false, setVisible: controlVisible } : undefined,
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 1,
        });
        expect(controlVisible).toHaveBeenCalledWith(true);
      },
    );
  });

  it("skips undefined items when iterating getLength/get collections", () => {
    const controlVisible = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            getLength: () => 3,
            get: (i: number) =>
              i === 1 ? undefined : { getVisible: () => false, setVisible: controlVisible },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 2,
        });
        expect(controlVisible).toHaveBeenCalledTimes(2);
      },
    );
  });

  it("unhides attribute-bound controls", () => {
    const attrControlVisible = vi.fn();
    withMockXrmPage(
      {
        data: {
          entity: {
            attributes: {
              forEach(fn) {
                fn({
                  controls: {
                    forEach(cfn) {
                      cfn({
                        getVisible: () => false,
                        setVisible: attrControlVisible,
                      });
                    },
                  },
                });
              },
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unhide")).toEqual({
          ok: true,
          action: "unhide",
          unhidden: 1,
        });
        expect(attrControlVisible).toHaveBeenCalledWith(true);
      },
    );
  });
});

describe("powerAppsFormActionInPage unlock", () => {
  it("enables disabled ui controls and attribute controls", () => {
    const uiDisabled = vi.fn();
    const attrDisabled = vi.fn();

    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn(
                mockControl({
                  getDisabled: () => true,
                  setDisabled: uiDisabled,
                }),
              );
            },
          },
        },
        data: {
          entity: {
            attributes: {
              forEach(fn) {
                fn({
                  controls: {
                    forEach(cfn) {
                      cfn(
                        mockControl({
                          getDisabled: () => true,
                          setDisabled: attrDisabled,
                        }),
                      );
                    },
                  },
                });
              },
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: true,
          action: "unlock",
          unlocked: 2,
        });
        expect(uiDisabled).toHaveBeenCalledWith(false);
        expect(attrDisabled).toHaveBeenCalledWith(false);
      },
    );
  });

  it("enables disabled controls in section.controls", () => {
    const sectionDisabled = vi.fn();
    withMockXrmPage(
      {
        ui: {
          tabs: {
            forEach(fn) {
              fn({
                sections: {
                  forEach(sfn) {
                    sfn({
                      controls: {
                        forEach(cfn) {
                          cfn(
                            mockControl({
                              getDisabled: () => true,
                              setDisabled: sectionDisabled,
                            }),
                          );
                        },
                      },
                    });
                  },
                },
              });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: true,
          action: "unlock",
          unlocked: 1,
        });
        expect(sectionDisabled).toHaveBeenCalledWith(false);
      },
    );
  });

  it("returns no_controls_updated when controls are already enabled", () => {
    const setDisabled = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn(
                mockControl({
                  getDisabled: () => false,
                  setDisabled,
                }),
              );
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: false,
          action: "unlock",
          unlocked: 0,
          error: "no_controls_updated",
        });
        expect(setDisabled).not.toHaveBeenCalled();
      },
    );
  });

  it("supports attribute controls via getLength/get only", () => {
    const attrDisabled = vi.fn();
    withMockXrmPage(
      {
        data: {
          entity: {
            attributes: {
              getLength: () => 1,
              get: (i: number) =>
                i === 0
                  ? {
                      controls: {
                        getLength: () => 1,
                        get: () =>
                          mockControl({
                            getDisabled: () => true,
                            setDisabled: attrDisabled,
                          }),
                      },
                    }
                  : { controls: { getLength: () => 0 } },
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: true,
          action: "unlock",
          unlocked: 1,
        });
      },
    );
  });

  it("unlocks when getDisabled is missing but setDisabled exists", () => {
    const setDisabled = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({ setDisabled });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: true,
          action: "unlock",
          unlocked: 1,
        });
        expect(setDisabled).toHaveBeenCalledWith(false);
      },
    );
  });

  it("unlocks when getDisabled throws", () => {
    const setDisabled = vi.fn();
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({
                getDisabled: () => {
                  throw new Error("crm");
                },
                setDisabled,
              });
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: true,
          action: "unlock",
          unlocked: 1,
        });
      },
    );
  });

  it("skips controls without setDisabled", () => {
    withMockXrmPage(
      {
        ui: {
          controls: {
            forEach(fn) {
              fn({});
            },
          },
        },
      },
      () => {
        expect(powerAppsFormActionInPage("unlock")).toEqual({
          ok: false,
          action: "unlock",
          unlocked: 0,
          error: "no_controls_updated",
        });
      },
    );
  });
});
