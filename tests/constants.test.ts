import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENFORCED_V3,
  DEFAULT_ENFORCEMENT_PREFERENCE,
  DNR_RULESET_CLASSIC_EDITOR_ID,
  DNR_RULESET_NEW_DESIGNER_ID,
  needsDefaultEnforcedV3Seed,
  needsDefaultPowerAppsHiddenFieldsSeed,
  needsDefaultPowerAppsReadOnlySeed,
  needsDefaultV3SurveyEnabledSeed,
  parseEnforcementPreference,
  parsePowerAppsHiddenFieldsMode,
  parsePowerAppsReadOnlyMode,
  parsePowerAppsPreferencesFromSync,
  parseV3SurveyEnabled,
  POPUP_SYNC_SETTINGS_KEYS,
  POWERAPPS_SYNC_KEYS,
  STORAGE_KEY_ENFORCED_V3,
  STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS,
  STORAGE_KEY_POWERAPPS_READ_ONLY,
  STORAGE_KEY_POPUP_THEME,
  STORAGE_KEY_V3SURVEY_ENABLED,
  SYNC_POLICY_KEYS,
} from "../src/constants";
import { EXTENSION_DISPLAY_NAME } from "../src/popup/about-meta";
import { POWERAPPS_HOST_PERMISSIONS, POWERAPPS_URL_PATTERNS } from "../src/powerapps/constants";
import {
  EXPECTED_MANIFEST_DESCRIPTION,
  MANIFEST_DESCRIPTION_MAX_LENGTH,
} from "./expected-manifest-description";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

type PublicManifest = {
  manifest_version?: number;
  name?: string;
  description?: string;
  minimum_chrome_version?: string;
  permissions?: string[];
  host_permissions?: string[];
  background?: { service_worker?: string; type?: string };
  action?: {
    default_popup?: string;
    default_title?: string;
    default_icon?: Record<string, string>;
  };
  content_scripts?: Array<{
    matches?: string[];
    js?: string[];
    run_at?: string;
    world?: string;
    all_frames?: boolean;
  }>;
  declarative_net_request?: {
    rule_resources?: Array<{ id: string; path: string; enabled?: boolean }>;
  };
  icons?: Record<string, string>;
};

function readPublicManifest(): PublicManifest {
  return JSON.parse(
    readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
  ) as PublicManifest;
}

describe("parseEnforcementPreference", () => {
  it('returns "true" only for strict string true', () => {
    expect(parseEnforcementPreference("true")).toBe("true");
  });

  it('returns "false" for string false', () => {
    expect(parseEnforcementPreference("false")).toBe("false");
  });

  it('returns "off" for strict string off', () => {
    expect(parseEnforcementPreference("off")).toBe("off");
  });

  it("returns default for missing, invalid, or wrong-casing values", () => {
    expect(parseEnforcementPreference(undefined)).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference(null)).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference("")).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference("TRUE")).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference("OFF")).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference(1)).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
    expect(parseEnforcementPreference(true)).toBe(DEFAULT_ENFORCEMENT_PREFERENCE);
  });
});

describe("needsDefaultEnforcedV3Seed", () => {
  it("is false when storage already has a valid literal", () => {
    expect(needsDefaultEnforcedV3Seed("true")).toBe(false);
    expect(needsDefaultEnforcedV3Seed("false")).toBe(false);
    expect(needsDefaultEnforcedV3Seed("off")).toBe(false);
  });

  it("is true for missing or invalid persisted values", () => {
    expect(needsDefaultEnforcedV3Seed(undefined)).toBe(true);
    expect(needsDefaultEnforcedV3Seed(null)).toBe(true);
    expect(needsDefaultEnforcedV3Seed("")).toBe(true);
    expect(needsDefaultEnforcedV3Seed("TRUE")).toBe(true);
    expect(needsDefaultEnforcedV3Seed("OFF")).toBe(true);
  });
});

describe("needsDefaultV3SurveyEnabledSeed", () => {
  it("is false for strict true or false strings", () => {
    expect(needsDefaultV3SurveyEnabledSeed("true")).toBe(false);
    expect(needsDefaultV3SurveyEnabledSeed("false")).toBe(false);
  });

  it("is true for missing or invalid values", () => {
    expect(needsDefaultV3SurveyEnabledSeed(undefined)).toBe(true);
    expect(needsDefaultV3SurveyEnabledSeed(null)).toBe(true);
    expect(needsDefaultV3SurveyEnabledSeed("")).toBe(true);
    expect(needsDefaultV3SurveyEnabledSeed("TRUE")).toBe(true);
    expect(needsDefaultV3SurveyEnabledSeed(1)).toBe(true);
  });
});

/** Parsed from sync `v3surveyEnabled`: `true` = Show, `false` = Hide (default). */
describe("parseV3SurveyEnabled", () => {
  it("is true only for strict string true", () => {
    expect(parseV3SurveyEnabled("true")).toBe(true);
  });

  it("is false for any other input (including wrong casing and non-strings)", () => {
    expect(parseV3SurveyEnabled("false")).toBe(false);
    expect(parseV3SurveyEnabled(undefined)).toBe(false);
    expect(parseV3SurveyEnabled(null)).toBe(false);
    expect(parseV3SurveyEnabled("")).toBe(false);
    expect(parseV3SurveyEnabled("TRUE")).toBe(false);
    expect(parseV3SurveyEnabled(1)).toBe(false);
    expect(parseV3SurveyEnabled(true)).toBe(false);
  });
});

describe("storage and default mode constants", () => {
  it("uses stable storage key and default enforced mode", () => {
    expect(STORAGE_KEY_ENFORCED_V3).toBe("enforcedV3");
    expect(STORAGE_KEY_V3SURVEY_ENABLED).toBe("v3surveyEnabled");
    expect(STORAGE_KEY_POPUP_THEME).toBe("popupThemePreference");
    expect(DEFAULT_ENFORCED_V3).toBe("false");
    expect(DEFAULT_ENFORCEMENT_PREFERENCE).toBe("false");
  });

  it("exports sync policy key tuple for chrome.storage.get", () => {
    expect(SYNC_POLICY_KEYS).toEqual(["enforcedV3", "v3surveyEnabled"]);
  });

  it("exports popup combined sync keys for one storage read on open", () => {
    expect(POPUP_SYNC_SETTINGS_KEYS).toEqual([
      "enforcedV3",
      "v3surveyEnabled",
      "powerAppsHiddenFields",
      "powerAppsReadOnly",
    ]);
  });

  it("exports Power Apps sync keys and parsers", () => {
    expect(POWERAPPS_SYNC_KEYS).toEqual(["powerAppsHiddenFields", "powerAppsReadOnly"]);
    expect(parsePowerAppsHiddenFieldsMode("show")).toBe("show");
    expect(parsePowerAppsHiddenFieldsMode("SHOW")).toBe("hide");
    expect(parsePowerAppsReadOnlyMode("unlock")).toBe("unlock");
    expect(parsePowerAppsPreferencesFromSync({})).toEqual({ hidden: "hide", readOnly: "lock" });
    expect(needsDefaultPowerAppsHiddenFieldsSeed(undefined)).toBe(true);
    expect(needsDefaultPowerAppsReadOnlySeed("lock")).toBe(false);
    expect(needsDefaultPowerAppsReadOnlySeed("unlock")).toBe(false);
    expect(needsDefaultPowerAppsHiddenFieldsSeed("show")).toBe(false);
    expect(STORAGE_KEY_POWERAPPS_HIDDEN_FIELDS).toBe("powerAppsHiddenFields");
    expect(STORAGE_KEY_POWERAPPS_READ_ONLY).toBe("powerAppsReadOnly");
  });

  it("exports DNR ruleset ids used by buildUpdateRulesetOptions", () => {
    expect(DNR_RULESET_CLASSIC_EDITOR_ID).toBe("dnr-classic-editor");
    expect(DNR_RULESET_NEW_DESIGNER_ID).toBe("dnr-new-designer");
  });
});

describe("public/manifest.json (drift guard vs src/constants.ts)", () => {
  it("name matches popup EXTENSION_DISPLAY_NAME (store / browser UI alignment)", () => {
    const manifest = readPublicManifest();
    expect(manifest.name).toBe(EXTENSION_DISPLAY_NAME);
  });

  it("default_title matches EXTENSION_DISPLAY_NAME", () => {
    const manifest = readPublicManifest();
    expect(manifest.action?.default_title).toBe(EXTENSION_DISPLAY_NAME);
  });

  it("description matches canonical public summary (Helvety shared copy module)", () => {
    const manifest = readPublicManifest();
    expect(manifest.description).toBe(EXPECTED_MANIFEST_DESCRIPTION);
  });

  it("description stays within Chrome Web Store / Chromium manifest length limit", () => {
    const manifest = readPublicManifest();
    const description = manifest.description ?? "";
    expect(description.length).toBeLessThanOrEqual(MANIFEST_DESCRIPTION_MAX_LENGTH);
    expect(EXPECTED_MANIFEST_DESCRIPTION.length).toBeLessThanOrEqual(
      MANIFEST_DESCRIPTION_MAX_LENGTH,
    );
  });

  it("is MV3 with expected API permissions", () => {
    const manifest = readPublicManifest();
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.minimum_chrome_version).toBe("102");
    expect(manifest.action?.default_icon).toEqual({
      "16": "icons/ppconfigurator_16.png",
      "32": "icons/ppconfigurator_32.png",
      "48": "icons/ppconfigurator_48.png",
      "128": "icons/ppconfigurator_128.png",
    });
    expect(manifest.action?.default_icon).toEqual(manifest.icons);
    for (const relativePath of Object.values(manifest.action?.default_icon ?? {})) {
      expect(existsSync(join(repoRoot, "public", relativePath))).toBe(true);
    }
    expect([...(manifest.permissions ?? [])].sort()).toEqual(
      ["declarativeNetRequest", "scripting", "storage", "tabs", "webNavigation"].sort(),
    );
    expect(manifest.host_permissions?.sort()).toEqual(
      [
        "https://*.powerautomate.com/*",
        "https://flow.microsoft.com/*",
        ...POWERAPPS_HOST_PERMISSIONS,
      ].sort(),
    );
    expect(manifest.host_permissions).not.toContain("https://*.*.dynamics.com/*");
    expect(manifest.host_permissions).toContain("https://*.crm.dynamics.cn/*");
    expect(manifest.host_permissions).toContain("https://*.crm.microsoftdynamics.de/*");
    expect(manifest.host_permissions).toHaveLength(2 + POWERAPPS_HOST_PERMISSIONS.length);
    const raw = JSON.parse(readFileSync(join(repoRoot, "public", "manifest.json"), "utf8")) as {
      side_panel?: unknown;
    };
    expect(raw.side_panel).toBeUndefined();
  });

  it("does not export or reference Flow Inspector panel path in constants", () => {
    const constants = readFileSync(join(repoRoot, "src/constants.ts"), "utf8");
    expect(constants).not.toContain("INSPECTOR_PANEL_PATH");
    expect(constants).not.toContain("inspector.html");
  });

  it("declarative_net_request rulesets use the same ids and paths as constants", () => {
    const manifest = readPublicManifest();
    const resources = manifest.declarative_net_request?.rule_resources;
    expect(Array.isArray(resources)).toBe(true);
    expect(resources).toHaveLength(2);

    const byId = new Map(resources!.map((r) => [r.id, r]));
    expect(byId.get(DNR_RULESET_CLASSIC_EDITOR_ID)?.path).toBe("dnr-classic-editor.json");
    expect(byId.get(DNR_RULESET_NEW_DESIGNER_ID)?.path).toBe("dnr-new-designer.json");

    expect(byId.get(DNR_RULESET_CLASSIC_EDITOR_ID)?.enabled).toBe(true);
    expect(byId.get(DNR_RULESET_NEW_DESIGNER_ID)?.enabled).toBe(false);
  });

  it("icon paths match packaged files under public/", () => {
    const manifest = readPublicManifest();
    const icons = manifest.icons;
    expect(icons).toBeDefined();
    for (const size of ["16", "32", "48", "128"] as const) {
      const rel = icons![size];
      expect(rel).toBe(`icons/ppconfigurator_${size}.png`);
      expect(existsSync(join(repoRoot, "public", rel))).toBe(true);
      expect(existsSync(join(repoRoot, "assets", `ppconfigurator_${size}.png`))).toBe(true);
    }
  });

  it("DNR rule JSON files exist next to manifest", () => {
    expect(existsSync(join(repoRoot, "public", "dnr-classic-editor.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "public", "dnr-new-designer.json"))).toBe(true);
  });

  it("wires background, popup, and content script paths expected by the build", () => {
    const manifest = readPublicManifest();
    expect(manifest.background?.service_worker).toBe("background.js");
    expect(manifest.background?.type).toBe("module");
    expect(manifest.action?.default_popup).toBe("popup.html");
    const scripts = manifest.content_scripts ?? [];
    expect(scripts).toHaveLength(2);
    const isolated = scripts.find((s) => s.js?.includes("content.js"));
    const powerApps = scripts.find((s) => s.js?.includes("content-powerapps.js"));
    expect(isolated?.run_at).toBe("document_start");
    expect(isolated?.all_frames).toBe(true);
    expect(powerApps?.run_at).toBe("document_idle");
    expect(powerApps?.all_frames).toBe(true);
    expect(isolated?.world).toBeUndefined();
    expect(isolated?.matches?.sort()).toEqual(
      ["https://*.powerautomate.com/*", "https://flow.microsoft.com/*"].sort(),
    );
    expect(powerApps?.matches?.sort()).toEqual(
      [
        ...POWERAPPS_URL_PATTERNS.map((p) => p.replace("*://", "https://").replace(/\/?\*$/, "/*")),
      ].sort(),
    );
    expect(powerApps?.matches).not.toContain("https://*.*.dynamics.com/*");
  });
});
