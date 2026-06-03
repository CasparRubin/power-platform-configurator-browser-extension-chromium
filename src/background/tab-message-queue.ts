/** Serialize chrome.tabs.sendMessage calls per tab to avoid port-closed races. */

const tailByTab = new Map<number, Promise<unknown>>();

export function enqueueTabOperation<T>(tabId: number, operation: () => Promise<T>): Promise<T> {
  const previous = tailByTab.get(tabId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  tailByTab.set(
    tabId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}
