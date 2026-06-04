import { GitBranch, Package, Palette, Workflow } from "lucide-react";
import type { ThemePreference } from "@helvety/extension-chrome/theme-preference";
import { RadioGroup } from "@helvety/ui/radio-group";
import {
  DEVELOPER_NAME,
  DEVELOPER_URL,
  EXTENSION_DISPLAY_NAME,
  SOURCE_REPO_URL,
} from "../about-meta";
import {
  SETTINGS_CODE_CLASS,
  SETTINGS_RADIO_GROUP_CLASS,
  SETTINGS_SECTION_CLASS,
} from "../popup-layout";
import { HelvetyMark } from "@helvety/extension-chrome/helvety-mark";
import { SettingsBusyHint } from "./SettingsBusyHint";
import { SettingsChoiceRow } from "./SettingsChoiceRow";
import { SettingsDeveloperLink } from "./SettingsDeveloperLink";
import { SettingsMutedList } from "./SettingsMutedList";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { SettingsTabPanel } from "./SettingsTabPanel";
import { SettingsTextLink } from "./SettingsTextLink";

type AboutPanelProps = {
  extensionVersion: string;
  themePreference: ThemePreference;
  themeLoaded: boolean;
  onSaveTheme: (next: ThemePreference) => void;
};

export function AboutPanel({
  extensionVersion,
  themePreference,
  themeLoaded,
  onSaveTheme,
}: AboutPanelProps) {
  return (
    <SettingsTabPanel>
      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title={EXTENSION_DISPLAY_NAME}
          description={
            <>
              Power Automate: align flow and run URLs with the classic or new designer, optional{" "}
              <span className="font-medium text-foreground">v3survey</span> Hide/Show, and pause.
              Power Apps: show hidden fields or unlock read-only controls on model-driven record
              forms (client-side only).
            </>
          }
        />
      </section>

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title={
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Appearance
            </span>
          }
          trailing={themeLoaded ? null : <SettingsBusyHint mode="loading" />}
          description="If nothing is saved yet, light or dark is chosen from your system theme. Your choice below is saved on this device only."
        />
        <RadioGroup
          className={SETTINGS_RADIO_GROUP_CLASS}
          aria-label="Popup color theme"
          value={themePreference}
          onValueChange={(v) => {
            if (v === "light" || v === "dark") {
              onSaveTheme(v);
            }
          }}
        >
          <SettingsChoiceRow
            id="theme-light"
            value="light"
            selected={themePreference === "light"}
            label="Light"
            description="Always light."
          />
          <SettingsChoiceRow
            id="theme-dark"
            value="dark"
            selected={themePreference === "dark"}
            label="Dark"
            description="Always dark."
          />
        </RadioGroup>
      </section>

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title={
            <span className="flex items-center gap-2">
              <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              How it works
            </span>
          }
        />
        <SettingsMutedList>
          <li>
            <span className="font-medium text-foreground">Power Automate</span> rewrites only URLs
            on Power Automate hosts whose path contains{" "}
            <code className={SETTINGS_CODE_CLASS}>/flows/</code> or{" "}
            <code className={SETTINGS_CODE_CLASS}>/runs/</code>, and only while enforcement is not
            paused.
          </li>
          <li>
            The <span className="font-medium text-foreground">v3</span> query flag matches your flow
            designer choice. Survey prompt settings use{" "}
            <code className={SETTINGS_CODE_CLASS}>v3survey</code>:{" "}
            <span className="font-medium text-foreground">Hide</span> (default) uses{" "}
            <code className={SETTINGS_CODE_CLASS}>v3survey=false</code> on rewrites;{" "}
            <span className="font-medium text-foreground">Show</span> only normalizes an existing
            flag to <code className={SETTINGS_CODE_CLASS}>true</code> and never adds it when absent.
          </li>
          <li>
            <span className="font-medium text-foreground">Power Apps</span> uses the Xrm Client API
            on an open model-driven record form (
            <code className={SETTINGS_CODE_CLASS}>*.crm17.dynamics.com</code> and other regional org
            hosts, <code className={SETTINGS_CODE_CLASS}>apps.powerapps.com</code>). Canvas apps are
            not supported. Reload the extension after an update if injection is blocked for a
            permitted CRM URL.
          </li>
          <li>
            Power Automate uses layered enforcement: declarative net request rules, background
            navigation listeners, and a content script for SPA-style navigations.
          </li>
          <li>
            The toolbar icon shows a small badge:{" "}
            <span className="font-medium text-foreground">C</span> for Classic or{" "}
            <span className="font-medium text-foreground">N</span> for New Designer; the badge is
            cleared while <span className="font-medium text-foreground">Paused</span>.
          </li>
        </SettingsMutedList>
        <SettingsTextLink
          href={SOURCE_REPO_URL}
          icon={<GitBranch className="h-4 w-4 shrink-0" aria-hidden />}
        >
          Source code on GitHub
        </SettingsTextLink>
      </section>

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader
          title={
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Version
            </span>
          }
          description={extensionVersion}
        />
      </section>

      <section className={SETTINGS_SECTION_CLASS}>
        <SettingsSectionHeader title="Developer" />
        <SettingsDeveloperLink href={DEVELOPER_URL}>
          <HelvetyMark className="h-7 w-7" />
          <span className="flex min-w-0 flex-1 flex-col gap-0">
            <span className="text-sm font-medium text-foreground">{DEVELOPER_NAME}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">helvety.com</span>
          </span>
        </SettingsDeveloperLink>
      </section>
    </SettingsTabPanel>
  );
}
