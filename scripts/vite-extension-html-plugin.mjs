import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Strip crossorigin attributes — they can block assets in chrome-extension:// pages. */
export function extensionHtmlPlugin() {
  return {
    name: "extension-html",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.replace(/ crossorigin/g, "");
      },
    },
  };
}

/**
 * Inlines built CSS into inspector.html and keeps the module script at the end of <body>.
 * Avoids a separate stylesheet request failing in the side panel.
 */
export function inspectorHtmlBundlePlugin(repoRoot) {
  return {
    name: "inspector-html-bundle",
    closeBundle() {
      const from = resolve(repoRoot, "dist", "index.html");
      const to = resolve(repoRoot, "dist", "inspector.html");
      if (existsSync(from)) {
        writeFileSync(to, readFileSync(from, "utf8"));
      }

      if (!existsSync(to)) {
        return;
      }

      let html = readFileSync(to, "utf8");

      const linkMatch = html.match(/<link rel="stylesheet" href="\.\/inspector-assets\/([^"]+)">/);
      if (linkMatch) {
        const cssPath = resolve(repoRoot, "dist", "inspector-assets", linkMatch[1]);
        if (existsSync(cssPath)) {
          const css = readFileSync(cssPath, "utf8");
          html = html.replace(linkMatch[0], `<style>\n${css}\n</style>`);
        }
      }

      const scriptMatch = html.match(/<script type="module" src="[^"]+"><\/script>/);
      if (scriptMatch) {
        html = html.replace(scriptMatch[0], "");
        html = html.replace("</body>", `    ${scriptMatch[0]}\n  </body>`);
      }

      html = html.replace(/ crossorigin/g, "");
      writeFileSync(to, html);
    },
  };
}
