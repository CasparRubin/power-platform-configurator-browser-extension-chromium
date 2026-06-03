/**
 * Serializes async work per queue instance so overlapping `chrome.storage.sync.set` calls for that
 * stream cannot reorder. The popup uses one queue for flow designer (`enforcedV3`) saves and a
 * separate queue for survey prompt (`v3surveyEnabled`) saves on the Power Automate tab (`App.tsx`).
 */
export function createAsyncQueue(): {
  enqueue: <T>(work: () => Promise<T>) => Promise<T>;
} {
  let tail: Promise<void> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = tail.then(() => work());
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return { enqueue };
}
