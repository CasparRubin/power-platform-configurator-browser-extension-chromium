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

Explain that the extension only adjusts **Power Automate flow/run URLs** on permitted hosts:

| Permission                                                       | Why it is needed                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest`                                          | Redirect **main-frame** navigations to add/replace the `v3` query flag (classic vs new designer) on `/flows/` and `/runs/` paths. |
| `webNavigation`                                                  | Apply the same URL policy when SPAs change history without a full navigation (History API).                                       |
| `storage`                                                        | Save user choices: editor mode (`enforcedV3`), survey Hide/Show (`v3surveyEnabled`), and local popup theme.                       |
| `host_permissions` (`*.powerautomate.com`, `flow.microsoft.com`) | Run only on Microsoft Power Automate hosts; no broad `<all_urls>` access.                                                         |

The manifest does **not** request `tabs`; `chrome.tabs.update` / `reload` are used only for permitted origins where Chromium allows it without the `tabs` permission.

## Marketing assets (repo)

| Asset                           | Path                                             |
| ------------------------------- | ------------------------------------------------ |
| Extension icons                 | `public/icons/ppconfigurator_{16,32,48,128}.png` |
| Marquee promo (1400×560)        | `assets/MarqueePromoTile_1400x560.png`           |
| Small promo (440×280)           | `assets/SmallPromoTile_440x280.png`              |
| Store screenshot (640×400)      | `assets/Screenshot_640x400.png`                  |
| Small promo HTML reference      | `assets/chrome web store/smallPromoTile.html`    |
| Developer mark (About tab only) | `assets/Identifier_whiteBg.svg`                  |

## Pre-submit smoke test

After `npm run build`, load unpacked **`dist/`** and verify:

1. **Editor:** Classic / New Designer / Paused — toolbar badge **C** / **N** / cleared.
2. **Survey:** Hide (default) vs Show on a flow/run URL.
3. **About:** Developer link to Helvety; Appearance theme persists locally.
4. **DNR:** After reload, ruleset enablement matches saved preference (classic vs new ruleset ids in service worker console should show no static-rule errors).

See README **Validation checklist** for full behavior notes.

## Automation

- `npm run predeploy` runs unit tests, builds, then **`npm run test:dist`** (CSP + `dist/` artifact guards).
- CI and Release workflows run **`test:dist`** after **`build`**.
