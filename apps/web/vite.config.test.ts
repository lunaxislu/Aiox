import type { ProxyOptions, UserConfig } from "vite";
// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@vitejs/plugin-react", () => ({ default: () => [] }));
vi.mock("@tailwindcss/vite", () => ({ default: () => [] }));
afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

it.each(["/api/rpc", "/ws/terminal"])(
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
    },
);

it("does not invent a default daemon host or port", async () => {
    vi.stubEnv("AIOX_WEB_PROXY_TARGET", "");
    const config = (await import("./vite.config")).default as UserConfig;
    expect(config.server?.proxy).toBeUndefined();
});
