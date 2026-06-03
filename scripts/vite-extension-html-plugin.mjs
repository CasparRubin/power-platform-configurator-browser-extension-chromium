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
