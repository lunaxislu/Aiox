import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Vite keeps env files out of process.env, so `.env` has to be read here for
// `pnpm dev` to proxy without an inline variable. Neither source is defaulted.
const rpcTarget =
    process.env.AIOX_WEB_PROXY_TARGET ||
    loadEnv(
        "development",
        fileURLToPath(new URL(".", import.meta.url)),
        "AIOX_",
    ).AIOX_WEB_PROXY_TARGET;

// Root-relative assets also resolve on direct workspace URLs.
export default defineConfig({
    base: "/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // Set AIOX_WEB_PROXY_TARGET to the daemon Web listener for Vite development.
    server: rpcTarget
        ? {
              // Every /api and /ws route belongs to the daemon. Listing single
              // endpoints left new ones, such as image upload, hitting Vite.
              proxy: Object.fromEntries(
                  ["/api", "/ws"].map((path) => [
                      path,
                      {
                          target: rpcTarget,
                          ws: true,
                          changeOrigin: true,
                          configure(proxy) {
                              proxy.on(
                                  "proxyReqWs",
                                  (outgoing, request, socket) => {
                                      // Preserve the daemon's browser-origin boundary across the dev proxy.
                                      if (
                                          request.headers.origin !==
                                          `http://${request.headers.host}`
                                      ) {
                                          outgoing.destroy();
                                          socket.destroy();
                                          return;
                                      }
                                      outgoing.setHeader(
                                          "origin",
                                          new URL(rpcTarget).origin,
                                      );
                                  },
                              );
                              // Browsers send Origin on every write, so plain HTTP
                              // needs the same boundary. Same-origin reads omit it
                              // and stay for the daemon's own cross-site check.
                              proxy.on("proxyReq", (outgoing, request) => {
                                  const origin = request.headers.origin;
                                  if (origin === undefined) return;
                                  if (
                                      origin !==
                                      `http://${request.headers.host}`
                                  ) {
                                      outgoing.destroy();
                                      return;
                                  }
                                  outgoing.setHeader(
                                      "origin",
                                      new URL(rpcTarget).origin,
                                  );
                              });
                          },
                      } satisfies import("vite").ProxyOptions,
                  ]),
              ),
          }
        : {},
    build: { outDir: "dist", emptyOutDir: true },
});
