/**
 * (Re)inject content.js on Power Automate tabs when the bridge is missing — e.g. tab opened
 * before the extension was loaded or updated.
 */
export const PA_URL_PATTERNS = ["*://*.powerautomate.com/*", "*://flow.microsoft.com/*"] as const;

export async function injectContentIntoPowerAutomateTabs(): Promise<void> {
  if (!chrome.scripting?.executeScript) {
    return;
  }

  const tabs = await chrome.tabs.query({ url: [...PA_URL_PATTERNS] });
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }
      const target = { tabId: tab.id, allFrames: true };
      try {
        await chrome.scripting.executeScript({
          target,
          files: ["content-main-hook.js"],
          world: "MAIN",
        });
      } catch {
        /* frame may not allow MAIN injection */
      }
      try {
        await chrome.scripting.executeScript({
          target,
          files: ["content.js"],
          world: "ISOLATED",
        });
      } catch {
        /* restricted tab */
      }
    }),
  );
}

export async function injectMainWorldHookOnTab(tabId: number): Promise<void> {
  if (!chrome.scripting?.executeScript) {
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content-main-hook.js"],
      world: "MAIN",
    });
  } catch {
    /* ignore */
  }
}
