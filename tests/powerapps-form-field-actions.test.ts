import { describe, expect, it, vi } from "vitest";

import {
  unlockReadOnlyFields,
  unhideFormFields,
  type FormContextLike,
} from "../src/powerapps/form-field-actions";

function mockControl(overrides: {
  setVisible?: (visible: boolean) => void;
  setDisabled?: (disabled: boolean) => void;
}) {
  return overrides;
}

describe("unhideFormFields", () => {
  it("shows tabs, sections, and controls", () => {
    const tabVisible = vi.fn();
    const sectionVisible = vi.fn();
    const controlVisible = vi.fn();

    const formContext: FormContextLike = {
      ui: {
        tabs: {
          forEach(fn) {
            fn({
              setVisible: tabVisible,
              sections: {
                forEach(sfn) {
                  sfn({ setVisible: sectionVisible });
                },
              },
            });
          },
        },
        controls: {
          forEach(fn) {
            fn({ setVisible: controlVisible });
          },
        },
      },
    };

    const result = unhideFormFields(formContext);
    expect(result.unhidden).toBe(3);
    expect(tabVisible).toHaveBeenCalledWith(true);
    expect(sectionVisible).toHaveBeenCalledWith(true);
    expect(controlVisible).toHaveBeenCalledWith(true);
  });

  it("supports collections exposed via getLength/get only", () => {
    const controlVisible = vi.fn();
    const formContext: FormContextLike = {
      ui: {
        controls: {
          getLength: () => 1,
          get: (i: number) => ({ setVisible: i === 0 ? controlVisible : undefined }),
        },
      },
    };
    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(controlVisible).toHaveBeenCalledWith(true);
  });

  it("unhides attribute-bound controls", () => {
    const attrControlVisible = vi.fn();
    const formContext: FormContextLike = {
      data: {
        entity: {
          attributes: {
            forEach(fn) {
              fn({
                controls: {
                  forEach(cfn) {
                    cfn({ setVisible: attrControlVisible });
                  },
                },
              });
            },
          },
        },
      },
    };

    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(attrControlVisible).toHaveBeenCalledWith(true);
  });
});

describe("unlockReadOnlyFields", () => {
  it("enables ui controls and attribute controls", () => {
    const uiDisabled = vi.fn();
    const attrDisabled = vi.fn();

    const formContext: FormContextLike = {
      ui: {
        controls: {
          forEach(fn) {
            fn(mockControl({ setDisabled: uiDisabled }));
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
                    cfn(mockControl({ setDisabled: attrDisabled }));
                  },
                },
              });
            },
          },
        },
      },
    };

    const result = unlockReadOnlyFields(formContext);
    expect(result.unlocked).toBe(2);
    expect(uiDisabled).toHaveBeenCalledWith(false);
    expect(attrDisabled).toHaveBeenCalledWith(false);
  });

  it("supports attribute controls via getLength/get only", () => {
    const attrDisabled = vi.fn();
    const formContext: FormContextLike = {
      data: {
        entity: {
          attributes: {
            getLength: () => 1,
            get: (i: number) => ({
              controls:
                i === 0
                  ? {
                      getLength: () => 1,
                      get: (j: number) => ({ setDisabled: j === 0 ? attrDisabled : undefined }),
                    }
                  : undefined,
            }),
          },
        },
      },
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(1);
  });

  it("skips controls without setDisabled", () => {
    const formContext: FormContextLike = {
      ui: {
        controls: {
          forEach(fn) {
            fn({});
          },
        },
      },
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(0);
  });
});
