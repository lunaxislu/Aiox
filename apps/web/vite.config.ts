import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rpcTarget = process.env.AIOX_WEB_PROXY_TARGET;

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
              proxy: Object.fromEntries(
                  ["/api/rpc", "/ws/terminal"].map((path) => [
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
                          },
                      } satisfies import("vite").ProxyOptions,
                  ]),
              ),
          }
        : {},
    build: { outDir: "dist", emptyOutDir: true },
});
