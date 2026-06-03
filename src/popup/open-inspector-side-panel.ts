/**
 * Opens the Flow Inspector side panel from the popup button.
 * Must not `await` before `sidePanel.open` — that drops the user-gesture context.
 */
export function openInspectorSidePanelFromPopup(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.windowId === undefined) {
      return;
    }

    chrome.sidePanel.open({ windowId: tab.windowId }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error("[power-platform-configurator] sidePanel.open failed:", err.message);
        return;
      }
      window.close();
    });
  });
}
