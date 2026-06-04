import { resolve } from "node:path";

/** Single React instance for extension pages (avoids invalid hook call / null useState). */
export function extensionResolve(repoRoot) {
  const react = resolve(repoRoot, "node_modules/react");
  const reactDom = resolve(repoRoot, "node_modules/react-dom");

  return {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    alias: {
      "@helvety/shared": resolve(repoRoot, "node_modules/@helvety/shared/src"),
      react,
      "react-dom": reactDom,
      "react/jsx-runtime": resolve(react, "jsx-runtime.js"),
      "react/jsx-dev-runtime": resolve(react, "jsx-dev-runtime.js"),
    },
  };
}
