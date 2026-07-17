import { defineConfig } from "vitest/config";

/**
 * Coverage is scoped to modules exercised by unit tests. Entry points (`background`, `content`),
 * browser-only bundles (Power Apps MAIN-world inject), the React
 * popup shell, `persist-policy-preference.ts`, `policy-popup-log.ts`, and `@helvety/ui` primitives
 * are excluded so thresholds reflect logic we test in Node. Popup source structure (layout,
 * SettingsChoiceRow, SettingsBusyHint, tab host, notification region) is guarded by
 * `tests/popup-chrome.test.ts`,
 * `tests/popup-layout.test.ts`, `tests/popup-notification-ui.test.ts`,
 * `tests/popup-notification-visibility.test.ts`, `tests/infer-settings-status-variant.test.ts`,
 * `tests/persist-status-messages.test.ts`, `tests/popup-settings-copy.test.ts`,
 * `tests/settings-busy-hint.test.ts`, and docs drift tests. Generated active-tab and reduced-motion
 * CSS is asserted separately by `tests/dist-bundle.test.ts` under `test:dist`, outside coverage.
 * Power Apps is guarded by
 * `tests/powerapps-*.test.ts` (inject script behavior, apply-form-actions, constants,
 * datacenter-region table, host/manifest alignment, `host_not_permitted`, client formatting,
 * apply-preferences scheduler/retry, persist/format Power Apps popup saves, powerapps-client messaging).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "src/vite-env.d.ts",
        "src/background.ts",
        "src/background/**",
        "src/content.ts",
        "src/content-powerapps.ts",
        "src/popup/App.tsx",
        "src/popup/popup-layout.ts",
        "src/popup/main.tsx",
        "src/popup/persist-policy-preference.ts",
        "src/popup/policy-popup-log.ts",
        "src/powerapps/apply-form-actions.ts",
        "src/popup/components/**",
      ],
      thresholds: {
        lines: 98,
        statements: 98,
        /** Power Apps enforcement (timers, chrome stubs) adds branch-heavy paths; 96% reflects tested behavior. */
        branches: 96,
        functions: 95,
      },
    },
  },
});
