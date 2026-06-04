import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DATAVERSE_ORG_HOST_SUFFIXES,
  hostMatchesDynamicsOrgPattern,
  hostMatchesPowerAppsManifestPattern,
  isPowerAppsHostUrl,
  isValidChromeHostMatchPattern,
  POWERAPPS_HOST_PERMISSIONS,
  POWERAPPS_URL_PATTERNS,
} from "../src/powerapps/constants";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const CRM17_RECORD_FORM =
  "https://oms-test.crm17.dynamics.com/main.aspx?appid=b68b1477-2bdb-f011-8543-6045bd2b0ce1&pagetype=entityrecord&etn=eth_order&id=c7152972-4009-4f53-a0e9-7a5dfac4c956";

describe("isPowerAppsHostUrl", () => {
  it("accepts org CRM hosts including regional clusters", () => {
    expect(isPowerAppsHostUrl("https://contoso.crm.dynamics.com/main.aspx?appid=abc")).toBe(true);
    expect(isPowerAppsHostUrl("https://contoso.crm4.dynamics.com/")).toBe(true);
    expect(isPowerAppsHostUrl(CRM17_RECORD_FORM)).toBe(true);
  });

  it("accepts apps.powerapps.com", () => {
    expect(isPowerAppsHostUrl("https://apps.powerapps.com/play/e/abc")).toBe(true);
  });

  it("rejects malformed URLs", () => {
    expect(isPowerAppsHostUrl("not-a-url")).toBe(false);
  });

  it("rejects Power Automate and unrelated hosts", () => {
    expect(isPowerAppsHostUrl("https://make.powerautomate.com/environments/x/flows/y")).toBe(false);
    expect(isPowerAppsHostUrl("https://example.com/")).toBe(false);
    expect(isPowerAppsHostUrl(undefined)).toBe(false);
  });

  it("rejects dynamics.com hosts that are not model-driven CRM clusters", () => {
    expect(isPowerAppsHostUrl("https://admin.dynamics.com/")).toBe(false);
    expect(isPowerAppsHostUrl("https://foo.bar.dynamics.com/")).toBe(false);
    expect(isPowerAppsHostUrl("https://crm17.dynamics.com/")).toBe(false);
  });
});

describe("hostMatchesDynamicsOrgPattern", () => {
  it("matches two-label org hosts under dynamics.com", () => {
    expect(hostMatchesDynamicsOrgPattern("oms-test.crm17.dynamics.com")).toBe(true);
    expect(hostMatchesDynamicsOrgPattern("contoso.crm.dynamics.com")).toBe(true);
    expect(hostMatchesDynamicsOrgPattern("contoso.crm4.dynamics.com")).toBe(true);
  });

  it("does not match single-label or non-dynamics hosts", () => {
    expect(hostMatchesDynamicsOrgPattern("crm17.dynamics.com")).toBe(false);
    expect(hostMatchesDynamicsOrgPattern("apps.powerapps.com")).toBe(false);
  });

  it("matches three-label API hosts under dynamics.com", () => {
    expect(hostMatchesDynamicsOrgPattern("contoso.api.crm17.dynamics.com")).toBe(true);
  });

  it("matches sovereign org hosts from Microsoft Learn special suffixes", () => {
    expect(hostMatchesDynamicsOrgPattern("fabrikam.crm.microsoftdynamics.de")).toBe(true);
    expect(hostMatchesDynamicsOrgPattern("fabrikam.crm.dynamics.cn")).toBe(true);
  });
});

describe("POWERAPPS manifest constants drift", () => {
  it("POWERAPPS_HOST_PERMISSIONS stay in sync with public/manifest.json", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
    ) as { host_permissions?: string[] };
    const hosts = manifest.host_permissions ?? [];
    for (const entry of POWERAPPS_HOST_PERMISSIONS) {
      expect(hosts).toContain(entry);
    }
    expect(hosts).toContain("https://*.crm.dynamics.com/*");
    expect(hosts).toContain("https://*.crm17.dynamics.com/*");
    expect(hosts).not.toContain("https://*.*.dynamics.com/*");
  });

  it("Power Apps content_scripts matches align with POWERAPPS_URL_PATTERNS", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
    ) as { content_scripts?: Array<{ js?: string[]; matches?: string[] }> };
    const powerApps = manifest.content_scripts?.find((s) => s.js?.includes("content-powerapps.js"));
    const expected = POWERAPPS_URL_PATTERNS.map((p) =>
      p.replace("*://", "https://").replace(/\/?\*$/, "/*"),
    ).sort();
    expect(powerApps?.matches?.sort()).toEqual(expected);
    expect(powerApps?.matches).toContain("https://*.crm17.dynamics.com/*");
    expect(powerApps?.matches).not.toContain("https://*.*.dynamics.com/*");
  });

  it("declared match patterns use only Chrome-valid host wildcards", () => {
    for (const pattern of POWERAPPS_URL_PATTERNS) {
      expect(isValidChromeHostMatchPattern(pattern)).toBe(true);
    }
    for (const pattern of POWERAPPS_HOST_PERMISSIONS) {
      expect(isValidChromeHostMatchPattern(pattern)).toBe(true);
    }
    expect(isValidChromeHostMatchPattern("https://*.*.dynamics.com/*")).toBe(false);
    expect(isValidChromeHostMatchPattern("not-a-pattern")).toBe(false);
    expect(isValidChromeHostMatchPattern("https://foo.*.bar/*")).toBe(false);
  });

  it("hostMatchesPowerAppsManifestPattern accepts apps.powerapps.com", () => {
    expect(hostMatchesPowerAppsManifestPattern("apps.powerapps.com")).toBe(true);
    expect(hostMatchesPowerAppsManifestPattern("example.com")).toBe(false);
  });
});

describe("isPowerAppsHostUrl vs manifest cluster coverage", () => {
  const sampleHosts = [
    "https://contoso.crm.dynamics.com/main.aspx",
    "https://contoso.crm4.dynamics.com/",
    CRM17_RECORD_FORM,
  ];

  it.each(sampleHosts)("CRM host %s is accepted and matches org dynamics pattern", (url) => {
    expect(isPowerAppsHostUrl(url)).toBe(true);
    const hostname = new URL(url).hostname;
    expect(hostMatchesDynamicsOrgPattern(hostname)).toBe(true);
    expect(hostMatchesPowerAppsManifestPattern(hostname)).toBe(true);
  });

  it("every DATAVERSE_ORG_HOST_SUFFIXES entry has org host permission in manifest constants", () => {
    for (const suffix of DATAVERSE_ORG_HOST_SUFFIXES) {
      expect(POWERAPPS_HOST_PERMISSIONS).toContain(`https://*.${suffix}/*`);
    }
  });
});
