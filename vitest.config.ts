import { defineConfig } from "vitest/config";

/**
 * Coverage is scoped to modules exercised by unit tests. Entry points (`background`, `content`),
 * browser-only bundles (Power Apps MAIN-world inject), the React
 * popup shell, `persist-policy-preference.ts`, `policy-popup-log.ts`, and `@helvety/ui` primitives
 * are excluded so thresholds reflect logic we test in Node. Popup chrome (layout, SettingsChoiceRow,
 * tab host) is guarded by `tests/popup-chrome.test.ts` and docs drift tests; Power Apps helpers by
 * `tests/powerapps-*.test.ts`.
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
        "src/popup/powerapps-client.ts",
        "src/powerapps/apply-form-actions.ts",
        "src/powerapps/xrm-page-script.ts",
        "src/components/**",
        "src/popup/components/**",
      ],
      thresholds: {
        lines: 98,
        statements: 98,
        branches: 97,
        functions: 95,
      },
    },
  },
});
