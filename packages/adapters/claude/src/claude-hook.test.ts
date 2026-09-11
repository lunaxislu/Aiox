import { createServer } from "node:http";
import { Readable } from "node:stream";

import { afterEach, expect, it, vi } from "vitest";

import { claudeHookCommand, reportClaudeHook } from "@/claude-hook";

afterEach(() => vi.unstubAllGlobals());

const env = {
    AIOX_HOOK_URL: "http://127.0.0.1:1234/claude/hook",
    AIOX_HOOK_TOKEN: "hook-secret",
    CLAUDE_CODE_MESSAGING_SOCKET: "\\\\.\\pipe\\claude-test",
    CLAUDE_CODE_MESSAGING_TOKEN: "inbox-secret",
};

it("uses vendor exec-form arguments without shell interpolation", () => {
    expect(
        claudeHookCommand("C:\\Program Files\\node.exe", "C:\\a '$x\\hook.js"),
    ).toEqual({
        type: "command",
        command: "C:\\Program Files\\node.exe",
        args: ["C:\\a '$x\\hook.js"],
    });
});

it("forwards stdin and vendor inbox credentials using authenticated HTTP", async () => {
    let received: unknown;
    let authorization: string | undefined;
    const server = createServer(async (request, response) => {
        authorization = request.headers.authorization;
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        received = JSON.parse(Buffer.concat(chunks).toString());
        response.writeHead(204).end();
    });
    await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
    );
    try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No port");
        await reportClaudeHook(Readable.from(['{"session_id":"s"}']), {
            ...env,
            AIOX_HOOK_URL: `http://127.0.0.1:${address.port}/claude/hook`,
        });
        expect(authorization).toBe("Bearer hook-secret");
        expect(received).toEqual({
            event: { session_id: "s" },
            inboxPath: env.CLAUDE_CODE_MESSAGING_SOCKET,
            inboxToken: "inbox-secret",
        });
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
});

it.each([
    "secret malformed",
    "[]",
    "null",
    '"secret"',
    "x".repeat(1024 * 1024 + 1),
])("rejects invalid or oversized input without leaking it", async (input) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(reportClaudeHook(Readable.from([input]), env)).rejects.toThrow(
        "AIOX hook report failed.",
    );
    expect(fetch).not.toHaveBeenCalled();
});

it("does not follow redirects or retry rejected reports", async () => {
    const fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetch);
    await expect(reportClaudeHook(Readable.from(["{}"]), env)).rejects.toThrow(
        "AIOX hook report failed.",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: "error" });
});

it("bounds a hanging input stream", async () => {
    vi.useFakeTimers();
    try {
        const input = new Readable({ read() {} });
        const result = expect(reportClaudeHook(input, env)).rejects.toThrow(
            "AIOX hook report failed.",
        );
        await vi.advanceTimersByTimeAsync(5000);
        await result;
        expect(input.destroyed).toBe(true);
    } finally {
        vi.useRealTimers();
    }
});

it("ignores only an external report connection refusal after the daemon has gone away", async () => {
    const server = createServer();
    await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const disconnected = {
        ...env,
        AIOX_HOOK_URL: `http://127.0.0.1:${address.port}/report`,
    };
    await expect(
        reportClaudeHook(Readable.from(["{}"]), {
            ...disconnected,
            AIOX_EXECUTION_OWNERSHIP: "external",
        }),
    ).resolves.toBeUndefined();
    await expect(
        reportClaudeHook(Readable.from(["{}"]), disconnected),
    ).rejects.toThrow("AIOX hook report failed.");
});

it.each(["unauthorized", "timeout", "reset", "malformed"])(
    "external connection-refusal policy preserves %s diagnostics",
    async (failure) => {
        const fetch = vi.fn();
        if (failure === "unauthorized")
            fetch.mockResolvedValue(new Response(null, { status: 401 }));
        else if (failure === "timeout")
            fetch.mockRejectedValue(new DOMException("timeout", "AbortError"));
        else
            fetch.mockRejectedValue(
                new TypeError("fetch failed", {
                    cause: Object.assign(new Error("reset"), {
                        code: "ECONNRESET",
                    }),
                }),
            );
        vi.stubGlobal("fetch", fetch);
        await expect(
            reportClaudeHook(
                Readable.from([failure === "malformed" ? "not-json" : "{}"]),
                { ...env, AIOX_EXECUTION_OWNERSHIP: "external" },
            ),
        ).rejects.toThrow("AIOX hook report failed.");
        if (failure === "malformed") expect(fetch).not.toHaveBeenCalled();
    },
);
