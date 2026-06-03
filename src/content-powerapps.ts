/**
 * Isolated content script on model-driven Power Apps hosts.
 * Form actions run via background `executeScript` (MAIN world); this script reserves the match for future hooks.
 */
const BOOTSTRAP_KEY = "__ppConfiguratorPowerAppsContentBootstrapped";

const globalScope = globalThis as typeof globalThis & {
  [BOOTSTRAP_KEY]?: boolean;
};

if (!globalScope[BOOTSTRAP_KEY]) {
  globalScope[BOOTSTRAP_KEY] = true;
}
