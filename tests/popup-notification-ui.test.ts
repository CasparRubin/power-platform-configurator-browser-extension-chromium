import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { POWER_AUTOMATE_PERSIST_STATUS } from "../src/popup/persist-status-messages";
import { inferSettingsStatusVariant } from "../src/popup/infer-settings-status-variant";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const NOTIFICATION_SOURCE_PATHS = [
  "src/popup/App.tsx",
  "src/popup/components/PopupNotificationRegion.tsx",
  "src/popup/components/SettingsStatusAlert.tsx",
  "src/popup/components/SettingsInfoAlert.tsx",
  "src/popup/components/SettingsSectionHeader.tsx",
  "src/popup/components/PowerAppsPanel.tsx",
  "src/popup/format-powerapps-preferences.ts",
  "src/popup/persist-status-messages.ts",
  "src/popup/components/ui/alert.tsx",
  "src/popup/popup-layout.ts",
  "src/popup/infer-settings-status-variant.ts",
  "src/popup/popup-notification-visibility.ts",
] as const;

/** Inline panel status was replaced by the floating region anchored below the tab bar. */
const LEGACY_INLINE_PANEL_STATUS_PHRASES = [
  /role="status"[\s\S]{0,120}text-muted-foreground/,
  /<p\s+className="text-xs leading-snug text-muted-foreground"/,
  /useState\(""\)[\s\S]{0,80}statusClearTimerRef/,
] as const;

describe("popup notification UI modules exist", () => {
  it.each(NOTIFICATION_SOURCE_PATHS)("%s is on disk", (relativePath) => {
    expect(existsSync(join(repoRoot, relativePath))).toBe(true);
  });
});

describe("App notification region (anchored below tabs over the panel)", () => {
  const app = readSource("src/popup/App.tsx");

  it("uses controlled tabs and per-product status state", () => {
    expect(app).toContain("useState<PopupTab>");
    expect(app).toContain("power-automate");
    expect(app).toContain("powerAutomateStatus");
    expect(app).toContain("powerAppsStatusMessage");
    expect(app).toContain("powerAppsStatusVariant");
    expect(app).toContain("shouldShowPopupTabNotification");
    expect(app).toContain("value={activeTab}");
    expect(app).toContain("onValueChange");
  });

  it("renders PopupNotificationRegion between TabsList and tab panel host", () => {
    expect(app).toContain("<PopupNotificationRegion");
    expect(app).toContain("showPowerAutomateNotification");
    expect(app).toContain("showPowerAppsNotification");
    expect(app).toContain("variant={powerAppsStatusVariant}");
    const regionIdx = app.indexOf("<PopupNotificationRegion");
    const hostIdx = app.indexOf("className={TAB_PANEL_HOST_CLASS}");
    expect(regionIdx).toBeGreaterThan(-1);
    expect(hostIdx).toBeGreaterThan(regionIdx);
  });

  it("lifts Power Apps status timers and busy flags into App", () => {
    expect(app).toContain("powerAppsStatusClearTimerRef");
    expect(app).toContain("schedulePowerAppsStatusClear");
    expect(app).toContain("setPowerAppsStatus");
    expect(app).toContain("isPowerAppsSyncBusy");
    expect(app).toContain("isPowerAppsApplying");
    expect(app).toContain("setIsApplying={setIsPowerAppsApplying}");
  });
});

describe("PowerAppsPanel delegates status to App", () => {
  const panel = readSource("src/popup/components/PowerAppsPanel.tsx");

  it("receives setStatus and timer helpers as props", () => {
    expect(panel).toContain("setStatus:");
    expect(panel).toContain("clearPendingStatusDismiss:");
    expect(panel).toContain("scheduleStatusClear:");
    expect(panel).toContain("formatPowerAppsPreferencesApplyStatus");
    expect(panel).toContain("setStatus(formatted.message, formatted.variant)");
    expect(panel).not.toMatch(/useState\([^)]*\)[\s\S]{0,40}status/);
    expect(panel).not.toContain("statusClearTimerRef");
  });

  it.each(LEGACY_INLINE_PANEL_STATUS_PHRASES)("avoids legacy inline status: %s", (pattern) => {
    expect(panel).not.toMatch(pattern);
  });

  it("passes hideBusyHint into section headers", () => {
    expect(panel).toContain("hideBusyHint={hideBusyHint}");
  });
});

describe("section info callouts", () => {
  const sectionHeader = readSource("src/popup/components/SettingsSectionHeader.tsx");
  const infoAlert = readSource("src/popup/components/SettingsInfoAlert.tsx");

  it("uses quiet supporting copy by default and reserves callouts for explicit info", () => {
    expect(sectionHeader).toContain("SettingsInfoAlert");
    expect(sectionHeader).toContain("SETTINGS_SECTION_DESCRIPTION_CLASS");
    expect(sectionHeader).toContain('descriptionTone = "supporting"');
    expect(sectionHeader).toContain('descriptionTone === "info"');
    expect(sectionHeader).toContain("hideBusyHint");
  });

  it("SettingsInfoAlert uses shadcn Alert with info variant and icon", () => {
    expect(infoAlert).toContain('variant="info"');
    expect(infoAlert).toContain("lucide-react");
    expect(infoAlert).toContain("./ui/alert");
  });
});

describe("PopupNotificationRegion explicit variant", () => {
  const region = readSource("src/popup/components/PopupNotificationRegion.tsx");

  it("forwards optional variant to SettingsStatusAlert", () => {
    expect(region).toContain("variant?: SettingsStatusVariant");
    expect(region).toContain("variant={resolvedVariant}");
  });
});

describe("SettingsStatusAlert and layout tokens", () => {
  const statusAlert = readSource("src/popup/components/SettingsStatusAlert.tsx");
  const layout = readSource("src/popup/popup-layout.ts");

  it("maps variants to Alert and lucide icons", () => {
    expect(statusAlert).toContain("variantProp ?? inferSettingsStatusVariant");
    expect(statusAlert).toContain("inferSettingsStatusVariant");
    expect(statusAlert).toContain('role={variant === "error" ? "alert" : "status"}');
    expect(statusAlert).toContain('aria-live={variant === "error" ? "assertive" : "polite"}');
    expect(statusAlert).toContain("motion-reduce:animate-none");
    expect(statusAlert).toContain("Loader2");
    expect(statusAlert).toContain("CheckCircle2");
    expect(statusAlert).toContain("CircleAlert");
  });

  it("popup-layout exports notification region classes", () => {
    expect(layout).toContain("POPUP_NOTIFICATION_REGION_CLASS");
    expect(layout).toContain("POPUP_NOTIFICATION_SLOT_CLASS");
    expect(layout).toContain("POPUP_NOTIFICATION_ALERT_CLASS");
    expect(layout).toMatch(/w-full/);
    expect(layout).toMatch(/top-2/);
    expect(readSource("src/popup/components/ui/alert.tsx")).toContain("flex");
    expect(readSource("src/popup/components/ui/alert.tsx")).not.toContain("[&>svg]:absolute");
  });
});

describe("persist status strings match variant inference", () => {
  it("classifies Power Automate persist messages", () => {
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saving)).toBe("loading");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.refreshing)).toBe("loading");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.saved)).toBe("success");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.savedReloaded)).toBe("success");
    expect(inferSettingsStatusVariant(POWER_AUTOMATE_PERSIST_STATUS.savedReloadPage)).toBe(
      "success",
    );
  });

  it("Power Apps formatted apply outcomes pass explicit notification variants", () => {
    const app = readSource("src/popup/App.tsx");
    expect(app).toContain("powerAppsStatusVariant");
    expect(app).toContain("variant={powerAppsStatusVariant}");
    expect(readSource("src/popup/components/PowerAppsPanel.tsx")).toContain(
      "setStatus(formatted.message, formatted.variant)",
    );
  });

  it("persist modules import shared status constants", () => {
    expect(readSource("src/popup/persist-policy-preference.ts")).toContain(
      "POWER_AUTOMATE_PERSIST_STATUS",
    );
    expect(readSource("src/popup/persist-powerapps-preference.ts")).toContain(
      "POWER_APPS_PERSIST_STATUS",
    );
  });
});
