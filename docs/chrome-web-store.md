# Chrome Web Store submission checklist

Use this when uploading **Power Platform Configurator** from a tagged release (`dist/` zip). Distribution is **Chrome Web Store only**; current Chromium-based Edge can install the same listing when third-party extension stores are allowed by the user or administrator (no separate Edge Add-ons package).

## Package to upload

- Build and validate the release commit with `npm run predeploy` before creating its tag.
- Upload the generated zip (`power-platform-configurator-vX.Y.Z.zip`). **`manifest.json` must be at the archive root** (e.g. `manifest.json`, not `dist/manifest.json` or `./manifest.json`). On Windows, do **not** use `tar -a` to zip `dist/` — use `npm run package:zip`.
- Confirm **no DNR warnings** on `chrome://extensions` when loaded unpacked before submitting.
- Manifest ships `minimum_chrome_version` **111** and `action.default_icon` (same PNGs as top-level `icons`). Permissions and host lists must stay aligned with the table below. Chromium 111 is the floor for the popup’s OKLCH/`color-mix()` styling; MAIN-world scripting support predates that version.

## Listing fields (dashboard)

| Field                    | Value / notes                                                               |
| ------------------------ | --------------------------------------------------------------------------- |
| **Name**                 | Power Platform Configurator (must match manifest `name`)                    |
| **Short description**    | Manifest `description` (max **132** characters; see `public/manifest.json`) |
| **Detailed description** | Use Helvety Store long copy or adapt from README **What it does**           |
| **Privacy policy**       | https://helvety.com/privacy                                                 |
| **Homepage**             | https://helvety.com/store/products/helvety-power-platform-configurator      |
| **Category**             | Developer Tools (current listing; verify before each submission)            |

The privacy disclosure should state that the extension reads supported Power Automate flow/run URLs and accesses model-driven form UI objects locally to apply user-selected settings. Four enforcement preferences use `chrome.storage.sync`; popup appearance uses `chrome.storage.local`. The extension does not transmit tab URLs, form content, or preferences to Helvety servers. Browser sync and store/runtime providers may process data under their own policies. Recheck the developer dashboard's data-use answers whenever behavior or permissions change.

## Permission justifications (single purpose)

Explain that the extension adjusts **Power Automate flow/run URLs** on permitted hosts and offers optional **model-driven Power Apps** form helpers:

| Permission                               | Why it is needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`                  | Redirect **main-frame** navigations to add/replace the `v3` query flag (classic vs new designer) on `/flows/` and `/runs/` paths.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `webNavigation`                          | Apply the same URL policy when SPAs change history without a full navigation (History API).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripting`                              | Inject a self-contained MAIN-world function on CRM / Power Apps tabs while sync prefs enable revealing hidden form elements or enabling disabled controls (re-applied on navigation and tab load; Xrm Client API on the record form; all permitted frames requested).                                                                                                                                                                                                                                                                                                   |
| `storage`                                | Save user choices: flow designer mode (`enforcedV3`), survey Hide/Show (`v3surveyEnabled`), Power Apps hidden/read-only modes (`powerAppsHiddenFields`, `powerAppsReadOnly`), and local popup theme.                                                                                                                                                                                                                                                                                                                                                                    |
| `host_permissions` (Power Automate, CRM) | Power Automate hosts permit DNR redirects, content scripts, and flow/run tab URL checks or reloads. Dataverse org patterns aligned with the [Microsoft region table](https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions), snapshot checked July 17, 2026 (e.g. `https://*.crm17.dynamics.com/*`, `https://*.crm.dynamics.cn/*`, `https://*.crm.microsoftdynamics.de/*`), plus `apps.powerapps.com`, permit content scripts, tab checks, and optional MAIN-world form injection. No Web API shards, `<all_urls>`, or broad `tabs` permission. |

## Marketing assets (repo)

| Asset                           | Path                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Extension icons                 | `public/icons/ppconfigurator_{16,32,48,128}.png`                                                          |
| Toolbar / action icons          | Same paths via manifest `action.default_icon`                                                             |
| Popup tab product marks         | `public/icons/Power_Automate_Scalable.svg`, `Power_Apps_Scalable.svg` via `TabProductIcon`                |
| Popup header icon (48px source) | `assets/ppconfigurator_48.png` via `PopupHeader`                                                          |
| Marquee promo (1400×560)        | `assets/MarqueePromoTile_1400x560.png`                                                                    |
| Small promo (440×280)           | `assets/SmallPromoTile_440x280.png`                                                                       |
| Store screenshot (640×400)      | Capture from the current release before upload; no screenshot is committed to avoid stale UI/version text |
| Small promo HTML reference      | `assets/chrome web store/smallPromoTile.html`                                                             |
| Developer mark (About tab only) | `@helvety/extension-chrome/helvety-mark` (`HelvetyMark` in About **Developer**)                           |

## Pre-submit smoke test

After `npm run build`, load unpacked **`dist/`** and verify:

1. **Popup** opens at **800×600** with tabs **Power Automate**, **Power Apps**, and **About** (toolbar popup only). The active tab has a filled surface and red underline. A zero-height anchor positions a floating `PopupNotificationRegion` / **`SettingsStatusAlert`** at the panel’s upper right for the active product tab only; it renders nothing when idle and does not shift content. Each tab scrolls in one full-height panel (stacked tab layers in `popup-layout.ts`, not three short bands). Settings use shared **`SettingsChoiceRow`** choice-card rows (full-row click target). Section descriptions use quiet supporting text by default; the disabled-controls security note uses **`SettingsInfoAlert`**. On open, **`App.tsx`** preloads policy + Power Apps prefs via **`POPUP_SYNC_SETTINGS_KEYS`** so tabs show saved values immediately.
2. **Power Automate tab:** Flow designer Classic / New / Paused — toolbar badge **C** / **N** / cleared; survey Hide (default) vs Show on flow/run URLs. Radios stay enabled during save; the floating notification shows **Saving preference…** / **Refreshing the active Power Automate tab…** / **Saved.** (or **Saved. Reloaded the active flow or run page.** / **Saved. Reload the flow or run page to apply.** when applicable).
3. **Power Apps tab:** On an open **record form** (e.g. `oms-test.crm17.dynamics.com` or `apps.powerapps.com`), choose **Reveal hidden elements** or **Enable disabled controls**. Choices persist in sync and stay active across tabs and record navigation until the corresponding **Keep hidden** / **Keep disabled** option is selected; reload open record forms to restore platform defaults. Actions apply client-side via Xrm (`setVisible` / `setDisabled`). Navigate to another record or app tab—revealed elements should stay visible while revealing is active. Radios stay enabled during save/apply. The floating notification should show success counts, informational guidance when an active-tab apply could not complete, action-specific “nothing to change” copy, or a specific error with recovery guidance.
4. **About:** Same scroll layout as other tabs (no card frame); **Developer** link to Helvety; **Appearance** theme persists locally.
5. **DNR:** After reload, ruleset enablement matches saved preference (classic vs new ruleset ids in service worker console should show no static-rule errors).

See README **Validation checklist** for full behavior notes.

## Automation

- `npm run predeploy` runs naming/format/lint/type checks, coverage-gated unit tests, the build, **`npm run test:dist:built`**, and **`npm run package:zip`**.
- Validation and packaging are local only; this repository has no remote automation.
