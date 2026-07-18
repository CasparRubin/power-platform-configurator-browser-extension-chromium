/**
 * Design tokens are full OKLCH colors from `@helvety/extension-chrome/extension-tokens.css`,
 * so reference them directly. Never re-wrap a token in an `hsl()` function: that emits invalid
 * `hsl(oklch(...))` which browsers drop (missing colors, white borders). The `color-mix` alpha
 * slot keeps Tailwind opacity modifiers (e.g. `bg-muted/40`) working and matches Tailwind v4's
 * `color-mix(in oklab, ...)` output used by the sibling extension.
 */
const alpha = (name) => `color-mix(in oklab, var(${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/popup/**/*.{html,ts,tsx}",
    "./node_modules/@helvety/ui/src/**/*.{ts,tsx}",
    "./.helvety/packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: alpha("--border"),
        input: alpha("--input"),
        ring: alpha("--ring"),
        background: alpha("--background"),
        foreground: alpha("--foreground"),
        primary: {
          DEFAULT: alpha("--primary"),
          foreground: alpha("--primary-foreground"),
        },
        secondary: {
          DEFAULT: alpha("--secondary"),
          foreground: alpha("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: alpha("--destructive"),
          foreground: alpha("--destructive-foreground"),
        },
        muted: {
          DEFAULT: alpha("--muted"),
          foreground: alpha("--muted-foreground"),
        },
        accent: {
          DEFAULT: alpha("--accent"),
          foreground: alpha("--accent-foreground"),
        },
        popover: {
          DEFAULT: alpha("--popover"),
          foreground: alpha("--popover-foreground"),
        },
        card: {
          DEFAULT: alpha("--card"),
          foreground: alpha("--card-foreground"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
    },
  },
  plugins: [],
};
