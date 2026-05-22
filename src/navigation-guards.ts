/** Minimal shape for `webNavigation` callback details (main frame only). */
type MainFrameDetailsLike = {
  frameId?: number;
  tabId?: number;
};

export function isMainFrameTabNavigation(details: MainFrameDetailsLike): boolean {
  return (
    details.frameId === 0 && typeof details.tabId === "number" && Number.isFinite(details.tabId)
  );
}
