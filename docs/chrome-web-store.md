# Chrome Web Store submission checklist

Use this when uploading **Power Platform Configurator** from a tagged release (`dist/` zip). Edge Add-ons uses the same MV3 package; dashboard copy may differ slightly.

## Package to upload

- Build from a release tag: `npm run build` (or download the GitHub Release asset).
- Upload the **`dist/`** contents as a zip (same layout as [`power-platform-configurator.zip`](../power-platform-configurator.zip) for Helvety Store).
- Confirm **no DNR warnings** on `chrome://extensions` when loaded unpacked before submitting.

## Listing fields (dashboard)

| Field                    | Value / notes                                                               |
| ------------------------ | --------------------------------------------------------------------------- |
| **Name**                 | Power Platform Configurator (must match manifest `name`)                    |
| **Short description**    | Manifest `description` (max **132** characters; see `public/manifest.json`) |
| **Detailed description** | Use Helvety Store long copy or adapt from README **What it does**           |
| **Privacy policy**       | https://helvety.com/privacy                                                 |
| **Homepage**             | https://helvety.com (manifest `homepage_url`)                               |
| **Category**             | Productivity (typical for Power Automate tooling)                           |

## Permission justifications (single purpose)

Explain that the extension adjusts **Power Automate flow/run URLs** on permitted hosts and offers optional **model-driven Power Apps** form helpers:

| Permission                               | Why it is needed                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`                  | Redirect **main-frame** navigations to add/replace the `v3` query flag (classic vs new designer) on `/flows/` and `/runs/` paths.                                                                                                                                                                                                                                                   |
| `webNavigation`                          | Apply the same URL policy when SPAs change history without a full navigation (History API).                                                                                                                                                                                                                                                                                         |
| `scripting`                              | Inject a self-contained MAIN-world function on CRM / Power Apps tabs while sync prefs enforce **Show hidden fields** or **Unlock read-only** (re-applied on navigation and tab load; Xrm Client API on the record form; all frames scanned).                                                                                                                                        |
| `storage`                                | Save user choices: flow designer mode (`enforcedV3`), survey Hide/Show (`v3surveyEnabled`), Power Apps hidden/read-only modes (`powerAppsHiddenFields`, `powerAppsReadOnly`), and local popup theme.                                                                                                                                                                                |
| `tabs`                                   | Reload the focused flow/run tab after policy saves; query tabs to apply Power Apps enforcement across open Dataverse hosts and read the active tab for popup status.                                                                                                                                                                                                                |
| `host_permissions` (Power Automate, CRM) | Power Automate hosts; per-region Dataverse patterns aligned with [Microsoft datacenter URLs](https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions) (e.g. `https://*.crm17.dynamics.com/*`, `https://*.crm.dynamics.cn/*`, `https://*.crm.microsoftdynamics.de/*`); matching `https://*.api.{suffix}/*` for Web API; `apps.powerapps.com`. No `<all_urls>`. |

## Marketing assets (repo)

| Asset                           | Path                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Extension icons                 | `public/icons/ppconfigurator_{16,32,48,128}.png`                                           |
| Popup tab product marks         | `public/icons/Power_Automate_Scalable.svg`, `Power_Apps_Scalable.svg` via `TabProductIcon` |
| Popup header icon (48px source) | `assets/ppconfigurator_48.png` via `PopupHeader`                                           |
| Marquee promo (1400×560)        | `assets/MarqueePromoTile_1400x560.png`                                                     |
| Small promo (440×280)           | `assets/SmallPromoTile_440x280.png`                                                        |
| Store screenshot (640×400)      | `assets/Screenshot_640x400.png`                                                            |
| Small promo HTML reference      | `assets/chrome web store/smallPromoTile.html`                                              |
| Developer mark (About tab only) | `assets/Identifier_whiteBg.svg`                                                            |

## Pre-submit smoke test

After `npm run build`, load unpacked **`dist/`** and verify:

1. **Popup** opens at roughly **800×600** with tabs **Power Automate**, **Power Apps**, and **About** (toolbar popup only). Each tab scrolls in one full-height panel below the tab bar (stacked tab layers in `popup-layout.ts`, not three short bands). Settings use shared **`SettingsChoiceRow`** choice-card rows (full-row click target) and **`SettingsBusyHint`** on section headers (**Saving…**, **Applying…**, etc.). On open, **`App.tsx`** preloads policy + Power Apps prefs via **`POPUP_SYNC_SETTINGS_KEYS`** so tabs show saved values immediately.
2. **Power Automate tab:** Flow designer Classic / New / Paused — toolbar badge **C** / **N** / cleared; survey Hide (default) vs Show on flow/run URLs. Radios stay enabled during save; hints show **Saving…** / **Reloading tab…** while work runs.
3. **Power Apps tab:** On an open **record form** (e.g. `oms-test.crm17.dynamics.com` or `apps.powerapps.com`), choose **Show hidden fields** or **Unlock read-only** (same radio rows as Power Automate); choices persist in sync and stay on across tabs and record navigation until you switch to **Hide** / **Lock** (reload forms to restore platform defaults). Actions apply client-side via Xrm (`setVisible` / `setDisabled`). Navigate to another record or app tab—hidden fields should stay visible while **Show** is selected. Radios stay enabled during save/apply; section hints show **Saving…** / **Applying…**. The status line should show success counts or a specific error (not on a record form, nothing hidden/disabled, inject failed, or reload the extension on `chrome://extensions` if the tab URL is not permitted after an update)—not a generic failure with no hint.
4. **About:** Developer link to Helvety; Appearance theme persists locally.
5. **DNR:** After reload, ruleset enablement matches saved preference (classic vs new ruleset ids in service worker console should show no static-rule errors).

See README **Validation checklist** for full behavior notes.

## Automation

- `npm run predeploy` runs unit tests, builds, then **`npm run test:dist`** (CSP + `dist/` artifact guards).
- CI and Release workflows run **`test:dist`** after **`build`**.
