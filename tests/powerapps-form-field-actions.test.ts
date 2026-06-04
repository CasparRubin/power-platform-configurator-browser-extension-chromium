import { describe, expect, it, vi } from "vitest";

import {
  unlockReadOnlyFields,
  unhideFormFields,
  type FormControlLike,
  type FormContextLike,
} from "../src/powerapps/form-field-actions";

function mockControl(overrides: {
  getVisible?: () => boolean;
  getDisabled?: () => boolean;
  setVisible?: (visible: boolean) => void;
  setDisabled?: (disabled: boolean) => void;
}) {
  return overrides;
}

describe("unhideFormFields", () => {
  it("shows hidden tabs, sections, and controls", () => {
    const tabVisible = vi.fn();
    const sectionVisible = vi.fn();
    const controlVisible = vi.fn();

    const formContext: FormContextLike = {
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
    };

    const result = unhideFormFields(formContext);
    expect(result.unhidden).toBe(3);
    expect(tabVisible).toHaveBeenCalledWith(true);
    expect(sectionVisible).toHaveBeenCalledWith(true);
    expect(controlVisible).toHaveBeenCalledWith(true);
  });

  it("unhides controls in section.controls collection", () => {
    const sectionControlVisible = vi.fn();
    const formContext: FormContextLike = {
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
    };
    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(sectionControlVisible).toHaveBeenCalledWith(true);
  });

  it("unhides when getVisible is missing but setVisible exists", () => {
    const setVisible = vi.fn();
    const formContext: FormContextLike = {
      ui: {
        controls: {
          forEach(fn) {
            fn({ setVisible });
          },
        },
      },
    };
    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(setVisible).toHaveBeenCalledWith(true);
  });

  it("unhides when getVisible throws", () => {
    const setVisible = vi.fn();
    const formContext: FormContextLike = {
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
    };
    expect(unhideFormFields(formContext).unhidden).toBe(1);
  });

  it("skips elements that are already visible", () => {
    const setVisible = vi.fn();
    const formContext: FormContextLike = {
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
    };
    expect(unhideFormFields(formContext).unhidden).toBe(0);
    expect(setVisible).not.toHaveBeenCalled();
  });

  it("supports collections exposed via getLength/get only", () => {
    const controlVisible = vi.fn();
    const formContext: FormContextLike = {
      ui: {
        controls: {
          getLength: () => 1,
          get: (i: number) =>
            (i === 0
              ? { getVisible: () => false, setVisible: controlVisible }
              : { setVisible: controlVisible }) as FormControlLike,
        },
      },
    };
    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(controlVisible).toHaveBeenCalledWith(true);
  });

  it("skips undefined items when iterating getLength/get collections", () => {
    const controlVisible = vi.fn();
    const formContext: FormContextLike = {
      ui: {
        controls: {
          getLength: () => 3,
          get: ((i: number) =>
            i === 1 ? undefined : { getVisible: () => false, setVisible: controlVisible }) as (
            index: number,
          ) => FormControlLike,
        },
      },
    };
    expect(unhideFormFields(formContext).unhidden).toBe(2);
    expect(controlVisible).toHaveBeenCalledTimes(2);
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
    };

    expect(unhideFormFields(formContext).unhidden).toBe(1);
    expect(attrControlVisible).toHaveBeenCalledWith(true);
  });
});

describe("unlockReadOnlyFields", () => {
  it("enables disabled ui controls and attribute controls", () => {
    const uiDisabled = vi.fn();
    const attrDisabled = vi.fn();

    const formContext: FormContextLike = {
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
    };

    const result = unlockReadOnlyFields(formContext);
    expect(result.unlocked).toBe(2);
    expect(uiDisabled).toHaveBeenCalledWith(false);
    expect(attrDisabled).toHaveBeenCalledWith(false);
  });

  it("enables disabled controls in section.controls", () => {
    const sectionDisabled = vi.fn();
    const formContext: FormContextLike = {
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
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(1);
    expect(sectionDisabled).toHaveBeenCalledWith(false);
  });

  it("skips controls that are already enabled", () => {
    const setDisabled = vi.fn();
    const formContext: FormContextLike = {
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
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(0);
    expect(setDisabled).not.toHaveBeenCalled();
  });

  it("supports attribute controls via getLength/get only", () => {
    const attrDisabled = vi.fn();
    const formContext: FormContextLike = {
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
                        ({
                          getDisabled: () => true,
                          setDisabled: attrDisabled,
                        }) as FormControlLike,
                    },
                  }
                : { controls: { getLength: () => 0 } },
          },
        },
      },
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(1);
  });

  it("unlocks when getDisabled is missing but setDisabled exists", () => {
    const setDisabled = vi.fn();
    const formContext: FormContextLike = {
      ui: {
        controls: {
          forEach(fn) {
            fn({ setDisabled });
          },
        },
      },
    };
    expect(unlockReadOnlyFields(formContext).unlocked).toBe(1);
    expect(setDisabled).toHaveBeenCalledWith(false);
  });

  it("unlocks when getDisabled throws", () => {
    const setDisabled = vi.fn();
    const formContext: FormContextLike = {
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
