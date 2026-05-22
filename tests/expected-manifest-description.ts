/**
 * Expected `description` in `public/manifest.json` (Edge/Chrome installed-extensions blurb).
 * Keep identical to `POWER_PLATFORM_CONFIGURATOR_PUBLIC_SUMMARY` in the Helvety monorepo
 * (`packages/shared/src/power-platform-configurator-copy.ts`), synced with this repo’s
 * `public/manifest.json` in `CasparRubin/power-platform-configurator-browser-extension-chromium`.
 *
 * Note: this line is long on purpose; some store dashboards suggest a shorter listing field than
 * the shipped manifest uses—use a shorter dashboard description if required, but keep this file
 * and the manifest in sync with the Helvety constant for the actual package.
 */
export const EXPECTED_MANIFEST_DESCRIPTION =
  "Configure Microsoft Power Automate Cloud Flows: choose Classic or New Designer (v3=false or v3=true), and optionally hide the Microsoft survey prompt asking why you made your selection." as const;
