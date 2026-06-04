/** Ambient types for `@helvety/*` workspace packages (avoids cross-repo React type duplication in `tsc`). */
declare module "@helvety/extension-chrome/extension-version" {
  export function readExtensionVersion(): string;
}

declare module "@helvety/extension-chrome/use-popup-theme" {
  export type ThemePreference = "light" | "dark";
  export function usePopupTheme(storageKey: string): {
    themePreference: ThemePreference;
    themeLoaded: boolean;
    saveTheme: (next: ThemePreference) => void;
  };
}

declare module "@helvety/extension-chrome/theme-preference" {
  export type ThemePreference = "light" | "dark";
  export function parseThemePreference(value: unknown): ThemePreference;
  export function resolveIsDark(preference: ThemePreference): boolean;
  export function applyThemeClassToDocument(isDark: boolean): void;
  export function defaultThemeFromSystem(): ThemePreference;
  export function prefersDarkFromSystem(): boolean;
}

declare module "@helvety/extension-chrome/popup-header" {
  import type { JSX } from "react";
  export function PopupHeader(props: {
    displayName: string;
    version?: string;
    iconSrc: string;
    iconAlt?: string;
  }): JSX.Element;
}

declare module "@helvety/extension-chrome/helvety-mark" {
  import type { JSX } from "react";
  export function HelvetyMark(props: { className?: string }): JSX.Element;
}

declare module "@helvety/extension-chrome/theme-boot";

declare module "@helvety/extension-chrome/extension-tokens.css";

declare module "@helvety/extension-chrome/popup.css";

declare module "@helvety/shared/utils" {
  export function cn(...inputs: unknown[]): string;
}

declare module "@helvety/ui/label" {
  import type { ComponentProps, JSX } from "react";
  export function Label(props: ComponentProps<"label">): JSX.Element;
}

declare module "@helvety/ui/radio-group" {
  import type { ComponentProps, JSX } from "react";
  export const RadioGroup: (
    props: ComponentProps<"div"> & {
      value?: string;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
    },
  ) => JSX.Element;
  export const RadioGroupItem: (
    props: ComponentProps<"button"> & {
      value: string;
    },
  ) => JSX.Element;
}

declare module "@helvety/ui/tabs" {
  import type { ComponentProps, JSX } from "react";
  export const Tabs: (
    props: ComponentProps<"div"> & {
      defaultValue?: string;
      value?: string;
      onValueChange?: (value: string) => void;
    },
  ) => JSX.Element;
  export const TabsList: (props: ComponentProps<"div">) => JSX.Element;
  export const TabsTrigger: (props: ComponentProps<"button"> & { value: string }) => JSX.Element;
  export const TabsContent: (props: ComponentProps<"div"> & { value: string }) => JSX.Element;
}
