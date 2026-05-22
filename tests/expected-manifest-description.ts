/**
 * Expected `description` in `public/manifest.json` (Edge/Chrome installed-extensions blurb).
 * Keep identical to `POWER_PLATFORM_CONFIGURATOR_PUBLIC_SUMMARY` in the Helvety monorepo
 * (`packages/shared/src/power-platform-configurator-copy.ts`), synced with this repo’s
 * `public/manifest.json` in `CasparRubin/power-platform-configurator-browser-extension-chromium`.
 *
 * Chrome / Edge cap manifest `description` at **132** characters. Store listing cards use the
 * longer {@link POWER_PLATFORM_CONFIGURATOR_STORE_SHORT_DESCRIPTION} in the Helvety monorepo.
 */
export const EXPECTED_MANIFEST_DESCRIPTION =
  "Configure Power Automate cloud flows: Classic or New Designer. Hide the survey prompt by default. Pause anytime." as const;

/** Chrome Web Store / Edge Add-ons manifest `description` maximum length. */
export const MANIFEST_DESCRIPTION_MAX_LENGTH = 132 as const;
