import { apiPath } from "@aiox/protocol";
import type { ProxyOptions, UserConfig } from "vite";
// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@vitejs/plugin-react", () => ({ default: () => [] }));
vi.mock("@tailwindcss/vite", () => ({ default: () => [] }));
afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("vite");
});

it.each(["/api", "/ws"])(
    "proxies %s and preserves the development origin boundary",
    async (path) => {
        vi.stubEnv("AIOX_WEB_PROXY_TARGET", "http://127.0.0.1:45678");
        const config = (await import("./vite.config")).default as UserConfig;
        const proxy = config.server?.proxy?.[path] as ProxyOptions;
        expect(proxy).toMatchObject({
            target: "http://127.0.0.1:45678",
            ws: true,
            changeOrigin: true,
        });
        const on = vi.fn();
        proxy.configure!(
            { on } as unknown as Parameters<
                NonNullable<ProxyOptions["configure"]>
            >[0],
            {},
        );
        const handler = on.mock.calls.find(
            ([name]) => name === "proxyReqWs",
        )![1];
        const outgoing = { setHeader: vi.fn(), destroy: vi.fn() };
        const socket = { destroy: vi.fn() };
        handler(
            outgoing,
            {
                headers: {
                    host: "localhost:5173",
                    origin: "http://localhost:5173",
                },
            },
            socket,
        );
        expect(outgoing.setHeader).toHaveBeenCalledWith(
            "origin",
            "http://127.0.0.1:45678",
        );
        for (const origin of [undefined, "https://attacker.example"]) {
            outgoing.setHeader.mockClear();
            handler(
                outgoing,
                { headers: { host: "localhost:5173", origin } },
                socket,
            );
            expect(outgoing.setHeader).not.toHaveBeenCalled();
        }
        expect(socket.destroy).toHaveBeenCalledTimes(2);
        expect(outgoing.destroy).toHaveBeenCalledTimes(2);

        // Browsers attach Origin to every write, which the daemon rejects unless
        // the proxy presents its own origin.
        const http = on.mock.calls.find(([name]) => name === "proxyReq")![1];
        const write = { setHeader: vi.fn(), destroy: vi.fn() };
        http(
            write,
            {
                headers: {
                    host: "localhost:5173",
                    origin: "http://localhost:5173",
                },
            },
            {},
        );
        expect(write.setHeader).toHaveBeenCalledWith(
            "origin",
            "http://127.0.0.1:45678",
        );
        write.setHeader.mockClear();
        // Same-origin reads send no Origin; the daemon's own check covers those.
        http(write, { headers: { host: "localhost:5173" } }, {});
        expect(write.setHeader).not.toHaveBeenCalled();
        expect(write.destroy).not.toHaveBeenCalled();
        http(
            write,
            {
                headers: {
                    host: "localhost:5173",
                    origin: "https://attacker.example",
                },
            },
            {},
        );
        expect(write.setHeader).not.toHaveBeenCalled();
        expect(write.destroy).toHaveBeenCalledTimes(1);
    },
);

it("covers every daemon endpoint under one prefix each", async () => {
    vi.stubEnv("AIOX_WEB_PROXY_TARGET", "http://127.0.0.1:45678");
    const config = (await import("./vite.config")).default as UserConfig;
    const prefixes = Object.keys(config.server?.proxy ?? {});
    for (const path of [
        "/api/rpc",
        apiPath.terminals,
        apiPath.terminalImage("terminal-id"),
        apiPath.status,
        "/ws/terminal/terminal-id",
    ])
        expect(prefixes.some((prefix) => path.startsWith(prefix))).toBe(true);
});

it("does not invent a default daemon host or port", async () => {
    vi.stubEnv("AIOX_WEB_PROXY_TARGET", "");
    vi.doMock("vite", async () => ({
        ...(await vi.importActual<typeof import("vite")>("vite")),
        loadEnv: () => ({}),
    }));
    const config = (await import("./vite.config")).default as UserConfig;
    expect(config.server?.proxy).toBeUndefined();
});

it("reads the proxy target from the env file when no variable is set", async () => {
    vi.stubEnv("AIOX_WEB_PROXY_TARGET", "");
    vi.doMock("vite", async () => ({
        ...(await vi.importActual<typeof import("vite")>("vite")),
        loadEnv: () => ({ AIOX_WEB_PROXY_TARGET: "http://127.0.0.1:45678" }),
    }));
    const config = (await import("./vite.config")).default as UserConfig;
    expect(config.server?.proxy?.["/api"]).toMatchObject({
        target: "http://127.0.0.1:45678",
    });
});
