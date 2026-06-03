import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Match icon filenames case-insensitively (Windows-friendly). */
export function findIconFilename(iconDir: string, expectedName: string): string | undefined {
  const needle = expectedName.toLowerCase();
  return readdirSync(iconDir).find((name) => name.toLowerCase() === needle);
}

export function expectIconExists(iconDir: string, expectedName: string): void {
  const match = findIconFilename(iconDir, expectedName);
  if (!match || !existsSync(join(iconDir, match))) {
    throw new Error(`Missing icon ${expectedName} under ${iconDir}`);
  }
}

/** Extract `public/icons/...` paths from TS source (e.g. TabProductIcon imports). */
export function extractPublicIconImports(source: string): string[] {
  const matches = source.matchAll(/public\/icons\/([^"'?]+\.svg)/g);
  return [...matches].map((m) => m[1]);
}
