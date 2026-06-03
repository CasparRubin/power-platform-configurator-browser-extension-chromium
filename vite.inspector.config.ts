import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

import { resolve } from "node:path";

import { fileURLToPath } from "node:url";

import {
  extensionHtmlPlugin,
  inspectorHtmlBundlePlugin,
} from "./scripts/vite-extension-html-plugin.mjs";

import { extensionResolve } from "./scripts/vite-extension-resolve.mjs";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

const inspectorRoot = resolve(repoRoot, "src", "inspector");

export default defineConfig({
  root: inspectorRoot,

  base: "./",

  resolve: extensionResolve(repoRoot),

  plugins: [react(), extensionHtmlPlugin(), inspectorHtmlBundlePlugin(repoRoot)],

  publicDir: false,

  build: {
    outDir: resolve(repoRoot, "dist"),

    emptyOutDir: false,

    assetsDir: "inspector-assets",

    rollupOptions: {
      input: resolve(inspectorRoot, "index.html"),
    },
  },
});
