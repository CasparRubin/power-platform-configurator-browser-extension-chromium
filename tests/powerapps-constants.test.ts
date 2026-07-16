import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DATAVERSE_ORG_HOST_SUFFIXES,
  DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES,
  dynamicsOrgHostPermission,
  dynamicsOrgUrlPattern,
  hostMatchesDataverseOrgSuffix,
  hostMatchesDynamicsOrgPattern,
  isPowerAppsHostUrl,
  isValidChromeHostMatchPattern,
  POWERAPPS_DYNAMICS_ORG_HOST_PERMISSIONS,
  POWERAPPS_HOST_PERMISSIONS,
} from "../src/powerapps/constants";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Dataverse host permission builders", () => {
  it("builds org and URL patterns from a suffix", () => {
    expect(dynamicsOrgHostPermission("crm17.dynamics.com")).toBe("https://*.crm17.dynamics.com/*");
    expect(dynamicsOrgUrlPattern("crm.microsoftdynamics.de")).toBe(
      "*://*.crm.microsoftdynamics.de/*",
    );
  });

  it("declares org permissions for every org suffix (no API host permissions)", () => {
    expect(POWERAPPS_DYNAMICS_ORG_HOST_PERMISSIONS).toHaveLength(
      DATAVERSE_ORG_HOST_SUFFIXES.length,
    );
    expect(POWERAPPS_HOST_PERMISSIONS).toHaveLength(DATAVERSE_ORG_HOST_SUFFIXES.length + 1);
    expect(POWERAPPS_HOST_PERMISSIONS.every((h) => !h.includes(".api."))).toBe(true);
  });
});

describe("hostMatchesDataverseOrgSuffix", () => {
  it("requires a single org label before the suffix", () => {
    expect(hostMatchesDataverseOrgSuffix("contoso.crm17.dynamics.com", "crm17.dynamics.com")).toBe(
      true,
    );
    expect(hostMatchesDataverseOrgSuffix("crm17.dynamics.com", "crm17.dynamics.com")).toBe(false);
    expect(hostMatchesDataverseOrgSuffix("contoso.crm17.dynamics.com", "crm.dynamics.com")).toBe(
      false,
    );
    expect(
      hostMatchesDataverseOrgSuffix("contoso.api.crm17.dynamics.com", "crm17.dynamics.com"),
    ).toBe(false);
  });
});

describe("isValidChromeHostMatchPattern", () => {
  it("accepts hosts without wildcards and a lone host wildcard", () => {
    expect(isValidChromeHostMatchPattern("https://apps.powerapps.com/*")).toBe(true);
    expect(isValidChromeHostMatchPattern("https://*/*")).toBe(true);
  });

  it("rejects invalid pattern shapes", () => {
    expect(isValidChromeHostMatchPattern("")).toBe(false);
    expect(isValidChromeHostMatchPattern("ftp://*.crm.dynamics.com/*")).toBe(true);
    expect(isValidChromeHostMatchPattern("https://*.*.dynamics.com/*")).toBe(false);
    expect(isValidChromeHostMatchPattern("https://sub.*.dynamics.com/*")).toBe(false);
  });
});

describe("isPowerAppsHostUrl sovereign and commercial hosts", () => {
  it.each(DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES)("accepts org on %s", (suffix) => {
    const url = `https://contoso.${suffix}/main.aspx`;
    expect(isPowerAppsHostUrl(url)).toBe(true);
    expect(hostMatchesDynamicsOrgPattern(new URL(url).hostname)).toBe(true);
  });
});

describe("manifest ↔ constants (Power Apps hosts only)", () => {
  it("public manifest Power Apps host_permissions equal POWERAPPS_HOST_PERMISSIONS", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "public", "manifest.json"), "utf8"),
    ) as { host_permissions?: string[] };
    const dynamicsAndApps = (manifest.host_permissions ?? []).filter(
      (h) => h.includes("dynamics") || h.includes("apps.powerapps.com"),
    );
    expect(dynamicsAndApps.sort()).toEqual([...POWERAPPS_HOST_PERMISSIONS].sort());
  });
});
