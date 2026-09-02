import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@aiox/protocol",
        replacement: fileURLToPath(
        new URL("./packages/protocol/src/index.ts", import.meta.url),
        ),
      },
      {
        find: /^react$/,
        replacement: fileURLToPath(
          new URL("./apps/web/node_modules/react/index.js", import.meta.url),
        ),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: fileURLToPath(
          new URL(
            "./apps/web/node_modules/react/jsx-runtime.js",
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: fileURLToPath(
          new URL(
            "./apps/web/node_modules/react/jsx-dev-runtime.js",
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react-dom\/client$/,
        replacement: fileURLToPath(
          new URL(
            "./apps/web/node_modules/react-dom/client.js",
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "legacy/**",
    ],
  },
});
