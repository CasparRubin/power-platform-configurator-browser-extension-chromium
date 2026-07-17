import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DNR_RULESET_CLASSIC_EDITOR_ID, DNR_RULESET_NEW_DESIGNER_ID } from "../src/constants";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

type DnrRule = {
  id: number;
  action: {
    type: string;
    redirect?: {
      transform?: {
        queryTransform?: {
          addOrReplaceParams?: Array<{ key: string; value: string }>;
        };
      };
    };
  };
  condition: {
    regexFilter?: string;
    resourceTypes?: string[];
  };
};

function readRules(path: string): DnrRule[] {
  return JSON.parse(readFileSync(path, "utf8")) as DnrRule[];
}

function matchesAnyRule(rules: DnrRule[], url: string): boolean {
  return rules.some((rule) => {
    const pattern = rule.condition.regexFilter;
    return pattern ? new RegExp(pattern).test(url) : false;
  });
}

describe("static DNR rule JSON (Chrome declarativeNetRequest)", () => {
  const classicPath = join(repoRoot, "public", "dnr-classic-editor.json");
  const newDesignerPath = join(repoRoot, "public", "dnr-new-designer.json");
  const manifestPath = join(repoRoot, "public", "manifest.json");

  it("rule files exist under public/", () => {
    expect(existsSync(classicPath)).toBe(true);
    expect(existsSync(newDesignerPath)).toBe(true);
  });

  it.each([classicPath, newDesignerPath])(
    "uses positive, unique numeric rule ids within %s",
    (path) => {
      const ids = readRules(path).map((rule) => rule.id);
      expect(ids.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it.each([classicPath, newDesignerPath])(
    "matches representative supported HTTPS URLs in %s",
    (path) => {
      const rules = readRules(path);
      const positiveUrls = [
        "https://make.powerautomate.com/flows/id",
        "https://emea.powerautomate.com/environments/foo/flows/id/details?x=1",
        "https://flow.microsoft.com/runs/id",
        "https://flow.microsoft.com/en-us/runs/id/details",
      ];
      const negativeUrls = [
        "http://make.powerautomate.com/flows/id",
        "https://example.com/flows/id",
        "https://make.powerautomate.com/environments/foo/home",
        "https://flow.microsoft.com/notflows/id",
      ];

      for (const url of positiveUrls) {
        expect(matchesAnyRule(rules, url), url).toBe(true);
      }
      for (const url of negativeUrls) {
        expect(matchesAnyRule(rules, url), url).toBe(false);
      }
    },
  );

  it("only redirects main_frame requests and only transforms the v3 query param", () => {
    for (const rules of [readRules(classicPath), readRules(newDesignerPath)]) {
      for (const rule of rules) {
        expect(rule.action.type).toBe("redirect");
        expect(rule.condition.resourceTypes).toEqual(["main_frame"]);
        const params = rule.action.redirect?.transform?.queryTransform?.addOrReplaceParams;
        expect(params).toHaveLength(1);
        expect(params?.[0]?.key).toBe("v3");
        expect(params?.[0]?.value).toMatch(/^(true|false)$/);
      }
    }
  });

  it("regex hosts align with manifest host_permissions", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      host_permissions?: string[];
      declarative_net_request?: {
        rule_resources?: Array<{ id: string; path: string }>;
      };
    };
    const hosts = manifest.host_permissions ?? [];
    expect(hosts).toContain("https://*.powerautomate.com/*");
    expect(hosts).toContain("https://flow.microsoft.com/*");
    expect(hosts).toContain("https://*.crm17.dynamics.com/*");
    expect(hosts).toContain("https://*.crm.microsoftdynamics.de/*");
    expect(hosts).not.toContain("https://*.*.dynamics.com/*");

    const byId = new Map(
      (manifest.declarative_net_request?.rule_resources ?? []).map((r) => [r.id, r.path]),
    );
    expect(byId.get(DNR_RULESET_CLASSIC_EDITOR_ID)).toBe("dnr-classic-editor.json");
    expect(byId.get(DNR_RULESET_NEW_DESIGNER_ID)).toBe("dnr-new-designer.json");

    const classic = readRules(classicPath);
    expect(classic[0]?.condition.regexFilter).toContain("powerautomate");
    expect(classic[1]?.condition.regexFilter).toContain("flow\\.microsoft\\.com");
    const newDesigner = readRules(newDesignerPath);
    expect(newDesigner[0]?.condition.regexFilter).toContain("powerautomate");
    expect(newDesigner[1]?.condition.regexFilter).toContain("flow\\.microsoft\\.com");
  });

  it("classic ruleset sets v3=false and new-designer sets v3=true", () => {
    const classicV3 = readRules(classicPath).map(
      (r) => r.action.redirect?.transform?.queryTransform?.addOrReplaceParams?.[0]?.value,
    );
    const newV3 = readRules(newDesignerPath).map(
      (r) => r.action.redirect?.transform?.queryTransform?.addOrReplaceParams?.[0]?.value,
    );
    expect(classicV3).toEqual(["false", "false"]);
    expect(newV3).toEqual(["true", "true"]);
  });
});
