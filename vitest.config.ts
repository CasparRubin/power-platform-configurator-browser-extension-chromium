import { defineConfig } from "vitest/config";

/**
 * Coverage is scoped to modules exercised by unit tests. Entry points (`background`, `content`),
 * the React popup shell, `persist-policy-preference.ts`, `policy-popup-log.ts`, and `@helvety/ui`
 * primitives are excluded so thresholds reflect logic we test in Node rather than E2E browser
 * targets (those pieces have dedicated tests or are DEV-only / UI glue). Popup chrome and theme
 * live in `@helvety/extension-chrome`; layout contracts are guarded by `tests/popup-chrome.test.ts`.
 * Smaller modules such as
 * `action-badge.ts` stay included (stubbed `chrome` in tests).
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
        "src/content.ts",
        "src/popup/App.tsx",
        "src/popup/main.tsx",
        "src/popup/persist-policy-preference.ts",
        "src/popup/policy-popup-log.ts",
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
