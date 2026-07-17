/**
 * Expected `description` in `public/manifest.json` (Chrome installed-extensions blurb).
 * Keep identical to `POWER_PLATFORM_CONFIGURATOR_PUBLIC_SUMMARY` in the Helvety monorepo
 * (`packages/shared/src/power-platform-configurator-copy.ts`), synced with this repo’s
 * `public/manifest.json` in `CasparRubin/power-platform-configurator-browser-extension-chromium`.
 *
 * Chrome caps manifest `description` at **132** characters. Store listing cards use the
 * longer {@link POWER_PLATFORM_CONFIGURATOR_STORE_SHORT_DESCRIPTION} in the Helvety monorepo.
 */
export const EXPECTED_MANIFEST_DESCRIPTION =
  "Choose classic or new designer for Power Automate flow/run URLs. Control survey flags. Reveal or enable Power Apps form elements." as const;

/** Chrome Web Store manifest `description` maximum length. */
export const MANIFEST_DESCRIPTION_MAX_LENGTH = 132 as const;
