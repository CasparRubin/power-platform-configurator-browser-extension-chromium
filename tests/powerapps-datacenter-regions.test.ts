import { describe, expect, it } from "vitest";

import {
  DATAVERSE_CRM_CLUSTER_LABELS,
  DATAVERSE_ORG_HOST_SUFFIXES,
  DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES,
  dynamicsOrgHostPermission,
  isPowerAppsHostUrl,
} from "../src/powerapps/constants";

/**
 * Region → org host suffix snapshot verified against Microsoft Learn on 2026-07-17.
 * @see https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions
 */
const MICROSOFT_LEARN_REGION_HOSTS: ReadonlyArray<{ region: string; orgHostSuffix: string }> = [
  { region: "NAM", orgHostSuffix: "crm.dynamics.com" },
  { region: "DEU", orgHostSuffix: "crm.microsoftdynamics.de" },
  { region: "SAM", orgHostSuffix: "crm2.dynamics.com" },
  { region: "CAN", orgHostSuffix: "crm3.dynamics.com" },
  { region: "EUR", orgHostSuffix: "crm4.dynamics.com" },
  { region: "APJ", orgHostSuffix: "crm5.dynamics.com" },
  { region: "OCE", orgHostSuffix: "crm6.dynamics.com" },
  { region: "JPN", orgHostSuffix: "crm7.dynamics.com" },
  { region: "IND", orgHostSuffix: "crm8.dynamics.com" },
  { region: "GCC", orgHostSuffix: "crm9.dynamics.com" },
  { region: "GCC High", orgHostSuffix: "crm.microsoftdynamics.us" },
  { region: "GBR", orgHostSuffix: "crm11.dynamics.com" },
  { region: "FRA", orgHostSuffix: "crm12.dynamics.com" },
  { region: "ZAF", orgHostSuffix: "crm14.dynamics.com" },
  { region: "UAE", orgHostSuffix: "crm15.dynamics.com" },
  { region: "GER", orgHostSuffix: "crm16.dynamics.com" },
  { region: "CHE", orgHostSuffix: "crm17.dynamics.com" },
  { region: "CHN", orgHostSuffix: "crm.dynamics.cn" },
  { region: "NOR", orgHostSuffix: "crm19.dynamics.com" },
  { region: "SGP", orgHostSuffix: "crm20.dynamics.com" },
  { region: "SWE", orgHostSuffix: "crm22.dynamics.com" },
  { region: "KOR", orgHostSuffix: "crm21.dynamics.com" },
];

describe("Microsoft Learn datacenter region coverage", () => {
  it("declares every org host suffix in the verified Microsoft Learn snapshot", () => {
    const declared = new Set(DATAVERSE_ORG_HOST_SUFFIXES);
    for (const { region, orgHostSuffix } of MICROSOFT_LEARN_REGION_HOSTS) {
      expect(declared.has(orgHostSuffix), `${region} → ${orgHostSuffix}`).toBe(true);
    }
    expect(declared.size).toBe(MICROSOFT_LEARN_REGION_HOSTS.length);
  });

  it("maps dynamics.com clusters from Learn rows (excluding sovereign TLDs)", () => {
    const learnDynamicsCom = MICROSOFT_LEARN_REGION_HOSTS.filter((r) =>
      r.orgHostSuffix.endsWith(".dynamics.com"),
    ).map((r) => r.orgHostSuffix.replace(".dynamics.com", ""));
    expect([...DATAVERSE_CRM_CLUSTER_LABELS].sort()).toEqual([...learnDynamicsCom].sort());
  });

  it("includes sovereign / special Learn hosts", () => {
    expect(DATAVERSE_SPECIAL_ORG_HOST_SUFFIXES).toEqual([
      "crm.microsoftdynamics.de",
      "crm.microsoftdynamics.us",
      "crm.dynamics.cn",
    ]);
  });

  it.each(MICROSOFT_LEARN_REGION_HOSTS)(
    "accepts sample org URL for $region ($orgHostSuffix)",
    ({ orgHostSuffix }) => {
      const sample = `https://contoso.${orgHostSuffix}/main.aspx?pagetype=entityrecord`;
      expect(isPowerAppsHostUrl(sample)).toBe(true);
      expect(dynamicsOrgHostPermission(orgHostSuffix)).toBe(`https://*.${orgHostSuffix}/*`);
    },
  );
});
