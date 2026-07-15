# Chrome Web Store submission checklist

Use this when uploading **Power Platform Configurator** from a tagged release (`dist/` zip). Distribution is **Chrome Web Store only**; Chromium Edge users can install the same listing from the Chrome Web Store (no separate Edge Add-ons package).

## Package to upload

- Build from a release tag: `npm run build` then `npm run package:zip` (or download the GitHub Release asset).
- Upload the generated zip (`power-platform-configurator-vX.Y.Z.zip`). **`manifest.json` must be at the archive root** (e.g. `manifest.json`, not `dist/manifest.json` or `./manifest.json`). On Windows, do **not** use `tar -a` to zip `dist/` — use `npm run package:zip` or the Linux `zip` command from [Release](.github/workflows/release.yml).
- Confirm **no DNR warnings** on `chrome://extensions` when loaded unpacked before submitting.
- Manifest ships `minimum_chrome_version` **111** and `action.default_icon` (same PNGs as top-level `icons`). Permissions and host lists must stay aligned with the table below. (111 is the floor for the popup's OKLCH design tokens, `color-mix()`, and `scripting` MAIN-world enforcement.)

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
| `tabs`                                   | Reload the focused flow/run tab after policy saves; query tabs to apply Power Apps enforcement across open Dataverse hosts; read the active tab for popup apply/notification feedback (including short in-popup retries while **Applying…**).                                                                                                                                       |
| `host_permissions` (Power Automate, CRM) | Power Automate hosts; per-region Dataverse patterns aligned with [Microsoft datacenter URLs](https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions) (e.g. `https://*.crm17.dynamics.com/*`, `https://*.crm.dynamics.cn/*`, `https://*.crm.microsoftdynamics.de/*`); matching `https://*.api.{suffix}/*` for Web API; `apps.powerapps.com`. No `<all_urls>`. |

## Marketing assets (repo)

| Asset                           | Path                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| Extension icons                 | `public/icons/ppconfigurator_{16,32,48,128}.png`                                           |
| Toolbar / action icons          | Same paths via manifest `action.default_icon`                                              |
| Popup tab product marks         | `public/icons/Power_Automate_Scalable.svg`, `Power_Apps_Scalable.svg` via `TabProductIcon` |
| Popup header icon (48px source) | `assets/ppconfigurator_48.png` via `PopupHeader`                                           |
| Marquee promo (1400×560)        | `assets/MarqueePromoTile_1400x560.png`                                                     |
| Small promo (440×280)           | `assets/SmallPromoTile_440x280.png`                                                        |
| Store screenshot (640×400)      | `assets/Screenshot_640x400.png`                                                            |
| Small promo HTML reference      | `assets/chrome web store/smallPromoTile.html`                                              |
| Developer mark (About tab only) | `@helvety/extension-chrome/helvety-mark` (`HelvetyMark` in About **Developer**)            |

## Pre-submit smoke test

After `npm run build`, load unpacked **`dist/`** and verify:

1. **Popup** opens at roughly **800×600** with tabs **Power Automate**, **Power Apps**, and **About** (toolbar popup only). A **notification area** below the tab bar (`PopupNotificationRegion` / **`SettingsStatusAlert`**) shows save/apply feedback for the active product tab only (empty slot when idle). Each tab scrolls in one full-height panel below that slot (stacked tab layers in `popup-layout.ts`, not three short bands). Settings use shared **`SettingsChoiceRow`** choice-card rows (full-row click target), bordered **`SettingsInfoAlert`** section descriptions, and **`SettingsBusyHint`** only when the notification slot is idle. On open, **`App.tsx`** preloads policy + Power Apps prefs via **`POPUP_SYNC_SETTINGS_KEYS`** so tabs show saved values immediately.
2. **Power Automate tab:** Flow designer Classic / New / Paused — toolbar badge **C** / **N** / cleared; survey Hide (default) vs Show on flow/run URLs. Radios stay enabled during save; the notification alert shows **Saving preference…** / **Reloading tab…** / **Saved.** (or **Saved. Reloaded…** / **Saved. Reload the flow or run page…** when a manual reload may be needed). **Power Apps:** saved **Hide** / **Lock** choices prompt **Reload the page** on open record forms.
3. **Power Apps tab:** On an open **record form** (e.g. `oms-test.crm17.dynamics.com` or `apps.powerapps.com`), choose **Show hidden fields** or **Unlock read-only** (same radio rows as Power Automate); choices persist in sync and stay on across tabs and record navigation until you switch to **Hide** / **Lock** (**reload the page** on open record forms to restore platform defaults). Actions apply client-side via Xrm (`setVisible` / `setDisabled`). Navigate to another record or app tab—hidden fields should stay visible while **Show** is selected. Radios stay enabled during save/apply. The notification area should show success counts, a blue reload hint when the form is still loading (preference already saved), or a specific red error (wrong host, inject failed, reload the extension on `chrome://extensions` if the tab URL is not permitted after an update)—not a generic failure with no hint.
4. **About:** Same scroll layout as other tabs (no card frame); **Developer** link to Helvety; **Appearance** theme persists locally.
5. **DNR:** After reload, ruleset enablement matches saved preference (classic vs new ruleset ids in service worker console should show no static-rule errors).

See README **Validation checklist** for full behavior notes.

## Automation

- `npm run predeploy` runs unit tests, builds, then **`npm run test:dist`** (CSP + `dist/` artifact guards).
- CI and Release workflows run **`test:dist`** after **`build`**.
