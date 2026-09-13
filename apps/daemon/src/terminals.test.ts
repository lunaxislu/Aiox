import { EventEmitter } from "node:events";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

import * as configModule from "@aiox/config";
import { loadConfig, saveConfig } from "@aiox/config";
import * as terminalModule from "@aiox/terminal";
import { defaultShell } from "@aiox/terminal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import { attachTerminal } from "@/terminals";
import type { DaemonHarness } from "@/testing";
import { startTestDaemon } from "@/testing";

let harness: DaemonHarness;

beforeEach(async () => {
    harness = await startTestDaemon();
});

afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await harness.close();
});

function openShell(): { id: string } {
    const shell = defaultShell();
    return harness.daemon.createTerminal({
        file: shell.file,
        args: shell.args,
        cols: 80,
        rows: 24,
    });
}

/** Collects pty bytes; control frames arrive as text and are kept apart. */
function attach(terminalId: string) {
    const socket = new WebSocket(
        `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/${terminalId}`,
    );
    let output = "";
    const control: unknown[] = [];
    socket.on("message", (data: Buffer, isBinary: boolean) => {
        if (isBinary) output += data.toString("utf8");
        else control.push(JSON.parse(data.toString("utf8")));
    });
    const open = new Promise<void>((resolve, reject) => {
        socket.once("open", () => resolve());
        socket.once("error", reject);
    });
    return {
        socket,
        control,
        open,
        text: () => stripVTControlCharacters(output).replaceAll("\r", ""),
        type: (line: string) => socket.send(Buffer.from(line, "utf8")),
        resize: (cols: number, rows: number) =>
            socket.send(JSON.stringify({ type: "resize", cols, rows })),
        close: () =>
            new Promise<void>((resolve) => {
                socket.once("close", () => resolve());
                socket.close();
            }),
    };
}

async function waitFor(
    predicate: () => boolean,
    label: string | (() => string),
    timeout = 4000,
): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(
        `timed out waiting for ${typeof label === "function" ? label() : label}`,
    );
}

describe("general shell sessions", () => {
    it.each(["", "   ", "\0"])(
        "rejects malformed request cwd %j as request input",
        async (cwd) => {
            const response = await fetch(harness.apiUrl("/api/terminals"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ cwd }),
            });
            expect(response.status).toBe(400);
            expect(await response.json()).toMatchObject({
                code: "invalid_request",
            });
        },
    );

    it.each([
        [undefined, 500, "invalid_config", "WSL probe diagnostic"],
        [undefined, 500, "invalid_config", "Windows probe timed out"],
        ["terminal.cwd", 400, "invalid_request", "cwd unavailable"],
    ] as const)(
        "classifies probe evidence %s (%s / %s: %s) without guessing from request cwd",
        async (field, status, code, message) => {
            vi.spyOn(
                configModule,
                "resolveTerminalLaunch",
            ).mockRejectedValueOnce(
                new configModule.ConfigError(message, field),
            );
            const spawn = vi.spyOn(terminalModule, "createTerminal");
            const response = await fetch(harness.apiUrl("/api/terminals"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ cwd: "/requested" }),
            });
            expect(response.status).toBe(status);
            expect(await response.json()).toMatchObject({ code });
            expect(spawn).not.toHaveBeenCalled();
        },
    );

    it.each([
        [
            "server shell",
            { shell: "aiox-missing-shell-executable" },
            {},
            500,
            "invalid_config",
        ],
        [
            "server shell with request cwd",
            { shell: "aiox-missing-shell-executable" },
            { cwd: "." },
            500,
            "invalid_config",
        ],
        ["server cwd", { cwd: "missing" }, {}, 500, "invalid_config"],
        ["request cwd", {}, { cwd: "missing" }, 400, "invalid_request"],
        ["request file cwd", {}, { cwd: "file" }, 400, "invalid_request"],
        [
            "request overrides server cwd",
            { cwd: "missing" },
            { cwd: "." },
            201,
            undefined,
        ],
    ] as const)(
        "classifies %s at the HTTP boundary",
        async (_name, settings, request, status, code) => {
            const home = harness.home;
            const configured = await startTestDaemon({
                terminal: async () => (await loadConfig({ home })).terminal,
            });
            try {
                await saveConfig(
                    {
                        terminal: {
                            shell: process.execPath,
                            args: ["-e", "setInterval(() => {}, 1000)"],
                            cwd: home,
                        },
                    },
                    { home },
                );
                const existing = await configured.daemon.createShell();
                await writeFile(join(home, "file"), "not a directory");
                await saveConfig(
                    {
                        terminal: {
                            shell: process.execPath,
                            args: ["-e", "setInterval(() => {}, 1000)"],
                            cwd: home,
                            ...settings,
                            ...("cwd" in settings
                                ? { cwd: join(home, settings.cwd) }
                                : {}),
                        },
                    },
                    { home },
                );
                const spawn = vi.spyOn(terminalModule, "createTerminal");
                const response = await fetch(
                    configured.apiUrl("/api/terminals"),
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(
                            "cwd" in request
                                ? { cwd: join(home, request.cwd) }
                                : {},
                        ),
                    },
                );
                expect(response.status).toBe(status);
                expect(await response.json()).toMatchObject(
                    code ? { code } : { cwd: home, alive: true },
                );
                expect(spawn).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
                expect(
                    configured.daemon.services.terminals.get(existing.id)
                        ?.alive,
                ).toBe(true);
            } finally {
                await configured.close();
            }
        },
    );

    it("classifies malformed server configuration and preserves unexpected launch errors", async () => {
        const home = harness.home;
        const configured = await startTestDaemon({
            terminal: async () => (await loadConfig({ home })).terminal,
        });
        const post = () =>
            fetch(configured.apiUrl("/api/terminals"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ cwd: home }),
            });
        try {
            await mkdir(join(home, ".aiox"), { recursive: true });
            for (const text of [
                "{",
                JSON.stringify({ terminal: { args: [1] } }),
            ]) {
                await writeFile(join(home, ".aiox", "config.json"), text);
                const response = await post();
                expect(response.status).toBe(500);
                expect(await response.json()).toMatchObject({
                    code: "invalid_config",
                });
            }
            await saveConfig(
                { terminal: { shell: process.execPath } },
                { home },
            );
            vi.spyOn(terminalModule, "createTerminal").mockImplementationOnce(
                () => {
                    throw new Error("native launch failed");
                },
            );
            const response = await post();
            expect(response.status).toBe(500);
            expect(await response.json()).toEqual({
                code: "internal_error",
                message: "native launch failed",
            });
        } finally {
            await configured.close();
        }
    });

    it.skipIf(process.platform === "win32")(
        "observes native exec failure through the PTY exit event",
        async () => {
            const session = harness.daemon.services.terminals.createShell({
                file: "aiox-missing-shell-executable",
                args: [],
                cwd: process.cwd(),
            });
            const exited = new Promise<number>((resolve) =>
                session.subscribe({
                    data: () => {},
                    exit: (event) => resolve(event.exitCode),
                }),
            );
            expect(await exited).not.toBe(0);
        },
    );
    it("does not create a shell when shutdown completes while configuration is loading", async () => {
        let release!: () => void;
        const loading = new Promise<void>((resolve) => {
            release = resolve;
        });
        const configured = await startTestDaemon({
            terminal: async () => {
                await loading;
                return {};
            },
        });
        const creating = configured.daemon.createShell();
        try {
            expect((await configured.daemon.stop(true)).stopped).toBe(true);
            release();
            await expect(creating).rejects.toThrow("stopping");
            expect(configured.daemon.services.terminals.list()).toEqual([]);
        } finally {
            release();
            await configured.close();
        }
    });
    it("does not create a shell when shutdown finishes during launch validation", async () => {
        const launch = await configModule.resolveTerminalLaunch({});
        let started!: () => void;
        const entered = new Promise<void>((resolve) => {
            started = resolve;
        });
        let release!: () => void;
        const validating = new Promise<void>((resolve) => {
            release = resolve;
        });
        vi.spyOn(configModule, "resolveTerminalLaunch").mockImplementation(
            async () => {
                started();
                await validating;
                return launch;
            },
        );
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        const creating = harness.daemon.createShell();
        await entered;
        try {
            expect((await harness.daemon.stop(true)).stopped).toBe(true);
            release();
            await expect(creating).rejects.toThrow("stopping");
            expect(spawn).not.toHaveBeenCalled();
        } finally {
            release();
        }
    });
    it("loads settings for each new Web shell and leaves existing shells alone", async () => {
        const home = harness.home;
        const configured = await startTestDaemon({
            terminal: async () => (await loadConfig({ home })).terminal,
        });
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        try {
            await saveConfig(
                {
                    terminal: {
                        shell: process.execPath,
                        args: ["-e", "setInterval(() => {}, 1000)"],
                        cwd: home,
                    },
                },
                { home },
            );
            const first = await configured.daemon.createShell();
            expect(spawn.mock.calls.at(-1)![0]).toMatchObject({
                file: process.execPath,
                cwd: home,
            });
            await saveConfig(
                {
                    terminal: {
                        shell: process.execPath,
                        args: ["-e", "setInterval(() => {}, 2000)"],
                        cwd: home,
                    },
                },
                { home },
            );
            const created = await fetch(configured.apiUrl("/api/terminals"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ cwd: process.cwd() }),
            });
            expect(created.status).toBe(201);
            expect(await created.json()).toMatchObject({
                cwd: process.cwd(),
                kind: "shell",
            });
            expect(spawn.mock.calls.at(-1)![0]).toMatchObject({
                args: ["-e", "setInterval(() => {}, 2000)"],
                cwd: process.cwd(),
            });
            expect(
                configured.daemon.services.terminals.get(first.id)?.alive,
            ).toBe(true);
            await saveConfig(
                { terminal: { shell: "aiox-missing-shell-executable" } },
                { home },
            );
            const spawns = spawn.mock.calls.length;
            const failed = await fetch(configured.apiUrl("/api/terminals"), {
                method: "POST",
            });
            expect(failed.status).toBe(500);
            expect(await failed.text()).toContain("terminal.shell");
            expect(spawn).toHaveBeenCalledTimes(spawns);
            expect(
                configured.daemon.services.terminals.get(first.id)?.alive,
            ).toBe(true);
            await saveConfig(
                { terminal: { shell: process.execPath } },
                { home },
            );
            // A file can become unusable after validation; preserve native failures.
            spawn.mockImplementationOnce(() => {
                throw new Error("native launch failed");
            });
            await expect(configured.daemon.createShell()).rejects.toThrow(
                "native launch failed",
            );
        } finally {
            await configured.close();
        }
    });
    it("rejects invalid final cwd before PTY creation and permits a valid request override", async () => {
        const home = harness.home;
        const missing = join(home, "missing");
        const file = join(home, "file");
        await writeFile(file, "not a directory");
        const configured = await startTestDaemon({
            terminal: async () => ({
                shell: process.execPath,
                args: ["-e", "setInterval(() => {}, 1000)"],
                cwd: missing,
            }),
        });
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        try {
            await expect(configured.daemon.createShell()).rejects.toThrow(
                "terminal.cwd",
            );
            await expect(
                configured.daemon.createShell({ cwd: file }),
            ).rejects.toThrow("terminal.cwd");
            expect(spawn).not.toHaveBeenCalled();
            const existing = await configured.daemon.createShell({ cwd: home });
            expect(spawn.mock.calls.at(-1)![0]).toMatchObject({ cwd: home });
            await expect(
                configured.daemon.createShell({ cwd: missing }),
            ).rejects.toThrow("terminal.cwd");
            expect(spawn).toHaveBeenCalledTimes(1);
            expect(
                configured.daemon.services.terminals.get(existing.id)?.alive,
            ).toBe(true);
        } finally {
            await configured.close();
        }
    });
    it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
        "rejects an inaccessible cwd before creating a PTY",
        async () => {
            const cwd = join(harness.home, "no-access");
            await mkdir(cwd);
            await chmod(cwd, 0);
            const spawn = vi.spyOn(terminalModule, "createTerminal");
            try {
                await expect(
                    harness.daemon.createShell({ cwd }),
                ).rejects.toThrow("terminal.cwd");
                expect(spawn).not.toHaveBeenCalled();
            } finally {
                await chmod(cwd, 0o700);
            }
        },
    );
    it("uses configured shell arguments and cwd", async () => {
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        const terminals = harness.daemon.services.terminals;
        const shell = terminals.createShell({
            file: process.execPath,
            args: ["-e", "setInterval(() => {}, 1000)"],
            cwd: harness.home,
        });
        expect(spawn.mock.calls.at(-1)![0]).toMatchObject({
            file: process.execPath,
            args: ["-e", "setInterval(() => {}, 1000)"],
            cwd: harness.home,
        });
        expect(terminals.view(shell.id)?.cwd).toBe(harness.home);
    });

    it("preserves a resolved WSL launch and its Linux display cwd", async () => {
        const terminals = harness.daemon.services.terminals;
        const existing = terminals.createShell(
            await configModule.resolveTerminalLaunch({}),
        );
        const spawn = vi
            .spyOn(terminalModule, "createTerminal")
            .mockImplementation((options) => ({ ...existing, id: options.id }));
        const shell = terminals.createShell({
            file: "C:\\Windows\\System32\\wsl.exe",
            args: ["--cd", "/home/me", "-d", "Ubuntu"],
            cwd: process.cwd(),
            displayCwd: "/home/me",
        });
        expect(spawn.mock.calls.at(-1)![0]).toMatchObject({
            args: ["--cd", "/home/me", "-d", "Ubuntu"],
            cwd: process.cwd(),
        });
        expect(terminals.view(shell.id)?.cwd).toBe("/home/me");
    });
    it("carries shell input and native resize across a browser detach without an Agent", async () => {
        const shell = harness.daemon.services.terminals.createShell({
            ...(await configModule.resolveTerminalLaunch({})),
            cols: 80,
            rows: 24,
        });
        const first = attach(shell.id);
        await first.open;
        try {
            first.type(
                process.platform === "win32"
                    ? "set /a 12345*6789\r"
                    : "echo $((12345*6789))\r",
            );
            await waitFor(
                () => first.text().includes("83810205"),
                "general shell output",
            );
            await first.close();
            expect(shell.alive).toBe(true);
            expect(harness.daemon.services.runtimes.list()).toEqual([]);
            const second = attach(shell.id);
            await second.open;
            try {
                await waitFor(
                    () => second.text().includes("83810205"),
                    "general shell replay",
                );
                const readSize = `"${process.execPath}" -p "process.stdout.getWindowSize().join('x')"\r`;
                second.type(readSize);
                await waitFor(
                    () => second.text().includes("80x24"),
                    "general shell initial size",
                );
                second.resize(111, 37);
                second.type(readSize);
                await waitFor(
                    () => second.text().includes("111x37"),
                    "general shell resized size",
                );
                expect(shell.alive).toBe(true);
                expect(harness.daemon.services.terminals.views()).toHaveLength(
                    1,
                );
            } finally {
                second.socket.terminate();
            }
        } finally {
            first.socket.terminate();
        }
    });

    it("preserves an unconfirmed shell and its context for a later cleanup retry", async () => {
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        const terminals = harness.daemon.services.terminals;
        const shell = terminals.createShell(
            await configModule.resolveTerminalLaunch({}),
        );
        const token = spawn.mock.calls[0]![0].env!["AIOX_TERMINAL_TOKEN"]!;
        const context = { terminalId: shell.id, token };
        vi.spyOn(shell, "kill").mockRejectedValueOnce(
            new Error("exit unconfirmed"),
        );
        await expect(terminals.kill(shell.id)).rejects.toThrow(
            "exit unconfirmed",
        );
        expect(terminals.authenticateContext(context) === shell).toBe(true);
        expect(terminals.view(shell.id)?.alive).toBe(true);
        expect(await terminals.kill(shell.id)).toBe(true);
        expect(terminals.get(shell.id)).toBeUndefined();
        expect(terminals.views()).toEqual([]);
        expect(() => terminals.authenticateContext(context)).toThrow();
    });

    it("keeps child context private, tied to one live shell, and clears it on exit", async () => {
        vi.stubEnv("AIOX_MCP_TOKEN", "inherited-agent-token");
        vi.stubEnv("AIOX_TERMINAL_TOKEN", "inherited-terminal-token");
        const spawn = vi.spyOn(terminalModule, "createTerminal");
        const terminals = harness.daemon.services.terminals;
        const shell = terminals.createShell(
            await configModule.resolveTerminalLaunch({}),
        );
        const env = spawn.mock.calls[0]![0].env!;
        const token = env["AIOX_TERMINAL_TOKEN"]!;
        expect(Boolean(token) && token !== "inherited-terminal-token").toBe(
            true,
        );
        expect(env["AIOX_MCP_TOKEN"]).toBeUndefined();
        expect(env["AIOX_TERMINAL_ID"]).toBe(shell.id);
        expect(terminals.views()).toEqual([
            { id: shell.id, cwd: process.cwd(), kind: "shell", alive: true },
        ]);
        expect(JSON.stringify(terminals.views()).includes(token)).toBe(false);
        expect(
            terminals.authenticateContext({ terminalId: shell.id, token }) ===
                shell,
        ).toBe(true);
        expect(() =>
            terminals.authenticateContext({
                terminalId: shell.id,
                token: shell.id,
            }),
        ).toThrow();
        const other = terminals.createShell(
            await configModule.resolveTerminalLaunch({}),
        );
        expect(() =>
            terminals.authenticateContext({ terminalId: other.id, token }),
        ).toThrow();
        const direct = terminals.create();
        expect(terminals.view(direct.id)?.kind).toBe("agent");
        expect(() =>
            terminals.authenticateContext({ terminalId: direct.id, token }),
        ).toThrow();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        shell.write("exit\r");
        await waitFor(() => !shell.alive, "general shell exit");
        expect(terminals.get(shell.id)).toBeUndefined();
        expect(terminals.view(shell.id)).toBeUndefined();
        expect(() =>
            terminals.authenticateContext({ terminalId: shell.id, token }),
        ).toThrow();
    });
});

describe("terminal attachment", () => {
    it("cleans an attempt's PTY when binding preparation fails", async () => {
        const terminal = openShell();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                terminalId: terminal.id,
                createBinding: async () => {
                    throw new Error("preparation failed");
                },
            }),
        ).rejects.toThrow("preparation failed");
        expect(session.alive).toBe(false);
        expect(
            harness.daemon.services.terminals.get(terminal.id),
        ).toBeUndefined();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect((await fetch(harness.apiUrl("/api/status"))).status).toBe(200);
    });

    it("rejects a foreign WebSocket origin and allows the actual Web origin", async () => {
        const terminal = openShell();
        const url = `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/${terminal.id}`;
        const foreign = new WebSocket(url, {
            origin: "https://foreign.example",
        });
        try {
            const result = await new Promise<string>((resolve) => {
                foreign.once("open", () => resolve("opened"));
                foreign.once("error", (error) => resolve(error.message));
            });
            expect(result).toContain("403");
        } finally {
            foreign.terminate();
        }
        const local = new WebSocket(url, { origin: harness.webUrl("") });
        try {
            await new Promise<void>((resolve, reject) => {
                local.once("open", resolve);
                local.once("error", reject);
            });
            expect(
                harness.daemon.services.terminals.get(terminal.id)?.alive,
            ).toBe(true);
        } finally {
            local.terminate();
        }
    });

    it("rejects an invalid encoded terminal path without affecting other connections", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;
        const invalid = new WebSocket(
            `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/%FF`,
        );
        try {
            const error = await new Promise<Error>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error("invalid path was not rejected")),
                    500,
                );
                invalid.once("error", (error) => {
                    clearTimeout(timer);
                    resolve(error);
                });
            });
            expect(error.message).toContain("400");
            expect(viewer.socket.readyState).toBe(WebSocket.OPEN);
            expect((await fetch(harness.apiUrl("/api/status"))).status).toBe(
                200,
            );
        } finally {
            invalid.terminate();
            viewer.socket.terminate();
        }
    });

    it("keeps a failed-stop TUI usable, then cleans its exit without stopping the daemon", async () => {
        const terminal = openShell();
        const network = await harness.daemon.services.networks.create(
            "manual-exit",
            "deny",
        );
        let attempts = 0;
        const registered = await harness.daemon.registerRuntime({
            name: "manual-exit",
            networkId: network.id,
            terminalId: terminal.id,
            createBinding: (controls) => {
                controls.setActivity("idle");
                return {
                    deliver: async () => {},
                    stop: async () => {
                        if (++attempts === 1)
                            throw new Error("exit unconfirmed");
                    },
                };
            },
        });
        const preserved = { from: "b", to: "c", policy: "allow" as const };
        await harness.daemon.services.db.networks.replaceRouting(network.id, {
            defaultPolicy: "deny",
            routes: [
                { from: registered.runtimeId, to: "b", policy: "allow" },
                { from: "c", to: registered.runtimeId, policy: "allow" },
                preserved,
            ],
        });
        const viewer = attach(terminal.id);
        await viewer.open;
        try {
            const result = await harness.daemon.stop(true);
            expect(result.stopped).toBe(false);
            expect(
                harness.daemon.services.terminals.get(terminal.id)?.alive,
            ).toBe(true);
            viewer.type("exit\r");
            await waitFor(
                () =>
                    harness.daemon.services.runtimes.get(
                        registered.runtimeId,
                    ) === undefined,
                "runtime cleanup after manual exit",
            );
            expect(
                harness.daemon.services.runtimes.authenticate(registered.token),
            ).toBeUndefined();
            expect(
                harness.daemon.services.terminals.get(terminal.id),
            ).toBeUndefined();
            expect(
                await harness.daemon.services.networks.require(network.id),
            ).toEqual({
                ...network,
                routes: [preserved],
            });
            expect((await fetch(harness.webUrl("/api/status"))).status).toBe(
                200,
            );
            expect((await harness.daemon.stop(false)).stopped).toBe(true);
        } finally {
            viewer.socket.terminate();
        }
    });

    it("carries input to the shell and its output back", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.type(
            process.platform === "win32"
                ? "set /a 12345*6789\r"
                : "echo $((12345*6789))\r",
        );
        await waitFor(
            () => viewer.text().includes("83810205"),
            () => `shell output: ${JSON.stringify(viewer.text())}`,
        );
        await viewer.close();
    });

    it("resizes the pty observed by its native TTY child", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        // A fresh TTY stream reads the native size; getWindowSize on an existing
        // Node stream returns cached columns/rows until a resize event arrives.
        const readSize = `"${process.execPath}" -p "process.stdout.getWindowSize().join('x')"\r`;
        viewer.type(readSize);
        await waitFor(
            () => viewer.text().includes("80x24"),
            () => `initial pty size: ${JSON.stringify(viewer.text())}`,
        );
        viewer.resize(120, 40);
        viewer.type(readSize);
        await waitFor(
            () => viewer.text().includes("120x40"),
            () => `new pty size: ${JSON.stringify(viewer.text())}`,
        );
        await viewer.close();
    });

    it("keeps the shell running when a viewer leaves, and replays for the next one", async () => {
        const terminal = openShell();
        const first = attach(terminal.id);
        await first.open;
        first.type("echo before-detach\r");
        await waitFor(
            () => first.text().includes("before-detach"),
            "first output",
        );

        // Closing a tab is a detach, never a stop.
        await first.close();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        expect(session.alive).toBe(true);

        const second = attach(terminal.id);
        await second.open;
        await waitFor(
            () => second.text().includes("before-detach"),
            "replayed output",
        );
        second.type("echo after-reattach\r");
        await waitFor(
            () => second.text().includes("after-reattach"),
            "live output after reattach",
        );
        await second.close();
        expect(session.alive).toBe(true);
    });

    it("serves two viewers of the same terminal at once", async () => {
        const terminal = openShell();
        const one = attach(terminal.id);
        const two = attach(terminal.id);
        await Promise.all([one.open, two.open]);

        one.type("echo both-see-this\r");
        await waitFor(
            () =>
                one.text().includes("both-see-this") &&
                two.text().includes("both-see-this"),
            "output on both viewers",
        );
        await one.close();

        two.type("echo still-here\r");
        await waitFor(
            () => two.text().includes("still-here"),
            "output after one viewer left",
        );
        await two.close();
    });

    it("tells an attached viewer when the shell exits", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.type("exit\r");
        await waitFor(
            () =>
                viewer.control.some(
                    (message) => (message as { type?: string }).type === "exit",
                ),
            "exit control frame",
        );
    });

    it("refuses to attach to a terminal that does not exist", async () => {
        const socket = new WebSocket(
            `ws://127.0.0.1:${harness.daemon.ports.web}/ws/terminal/nope`,
        );
        const error = await new Promise<Error>((resolve) => {
            socket.once("error", resolve);
        });
        expect(error.message).toContain("404");
    });

    it("ignores a malformed control frame instead of tearing the pty down", async () => {
        const terminal = openShell();
        const viewer = attach(terminal.id);
        await viewer.open;

        viewer.socket.send("not json at all");
        viewer.socket.send(JSON.stringify({ type: "resize", cols: -1 }));
        viewer.type("echo survived\r");
        await waitFor(
            () => viewer.text().includes("survived"),
            "output after bad control frames",
        );
        await viewer.close();
    });

    it("stops every managed terminal on a forced daemon stop", async () => {
        const terminal = openShell();
        const session = harness.daemon.services.terminals.get(terminal.id)!;
        await waitFor(() => session.pid > 0, "PTY child pid");
        const { pid } = session;

        const result = await harness.daemon.stop(true);
        expect(result.stopped).toBe(true);
        expect(result.warnings).toEqual([]);
        expect(session.alive).toBe(false);
        // ConPTY's close event can precede the OS process handle becoming dead.
        await waitFor(() => {
            try {
                process.kill(pid, 0);
                return false;
            } catch (error) {
                return (error as NodeJS.ErrnoException).code === "ESRCH";
            }
        }, "stopped terminal process exit");
    });
});

it("sends geometry, snapshot, held events and live output in attachment order", () => {
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
    });
    let listener!: terminalModule.TerminalAttachmentListener;
    const detach = vi.fn();
    const session = {
        attach: vi.fn((value) => {
            listener = value;
            return detach;
        }),
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    attachTerminal(socket as unknown as WebSocket, session);
    listener.snapshot({
        cols: 219,
        rows: 83,
        state: {} as never,
        data: Buffer.from("screen"),
        tail: [
            { type: "data", data: Buffer.from("held") },
            { type: "resize", cols: 170, rows: 83 },
        ],
    });
    listener.data(Buffer.from("live"));
    expect(
        socket.send.mock.calls.map(([frame]) =>
            typeof frame === "string" ? JSON.parse(frame) : frame.toString(),
        ),
    ).toEqual([
        { type: "snapshot", cols: 219, rows: 83, state: {} },
        "screen",
        { type: "snapshot-end" },
        "held",
        { type: "resize", cols: 170, rows: 83 },
        { type: "restored" },
        { type: "output", respond: true, offset: 4 },
        "live",
    ]);
    socket.emit("close");
    expect(detach).toHaveBeenCalledOnce();
    expect(session.kill).not.toHaveBeenCalled();
});

it("detaches when snapshot failure closes synchronously without killing the PTY", () => {
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(() => {
            socket.readyState = 3;
            socket.emit("close");
        }),
    });
    const detach = vi.fn();
    const session = {
        attach: (listener: terminalModule.TerminalAttachmentListener) => {
            listener.error(new Error("replay limit"));
            return detach;
        },
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    attachTerminal(socket as unknown as WebSocket, session);
    expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "error", message: "replay limit" }),
    );
    expect(detach).toHaveBeenCalledOnce();
    expect(session.kill).not.toHaveBeenCalled();
});

it("assigns one response owner per live output, transfers on user input and preserves delayed responses", () => {
    const listeners: terminalModule.TerminalAttachmentListener[] = [];
    const session = {
        attach: (listener: terminalModule.TerminalAttachmentListener) => {
            listeners.push(listener);
            return vi.fn();
        },
        write: vi.fn(),
        resize: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    const socket = () =>
        Object.assign(new EventEmitter(), {
            OPEN: 1,
            readyState: 1,
            send: vi.fn(),
            close: vi.fn(),
        });
    const one = socket();
    const two = socket();
    attachTerminal(one as unknown as WebSocket, session);
    attachTerminal(two as unknown as WebSocket, session);
    const output = (data: string) => {
        listeners.forEach((listener) => listener.data(Buffer.from(data)));
    };
    const frames = (peer: typeof one) =>
        peer.send.mock.calls.map(([frame]) =>
            typeof frame === "string" ? JSON.parse(frame) : frame.toString(),
        );
    output("\x1b[");
    expect(frames(one)).toEqual([
        { type: "output", respond: true, offset: 2 },
        "\x1b[",
    ]);
    expect(frames(two)).toEqual([
        { type: "output", respond: false, offset: 2 },
        "\x1b[",
    ]);
    two.emit("message", Buffer.from("user"), true);
    one.send.mockClear();
    two.send.mockClear();
    output("6n");
    expect(frames(one)).toEqual([
        { type: "output", respond: false, offset: 4 },
        "6n",
    ]);
    expect(frames(two)).toEqual([
        { type: "output", respond: true, offset: 4 },
        "6n",
    ]);
    one.emit(
        "message",
        Buffer.from(JSON.stringify({ type: "response", data: "\x1b[1;1R" })),
        false,
    );
    expect(session.write).toHaveBeenLastCalledWith("\x1b[1;1R");
    one.send.mockClear();
    two.send.mockClear();
    output("again");
    expect(frames(two)[0]).toMatchObject({ type: "output", respond: true });
    one.emit("message", Buffer.from("select-one"), true);
    const token = {};
    one.send.mockClear();
    two.send.mockClear();
    listeners[0]!.data(Buffer.from("delayed"), token);
    two.emit("message", Buffer.from("select-two"), true);
    listeners[1]!.data(Buffer.from("delayed"), token);
    expect(frames(one)[0]).toMatchObject({ type: "output", respond: true });
    expect(frames(two)[0]).toMatchObject({ type: "output", respond: false });
    one.send.mockClear();
    two.send.mockClear();
    const nextToken = {};
    listeners[0]!.data(Buffer.from("next"), nextToken);
    listeners[1]!.data(Buffer.from("next"), nextToken);
    expect(frames(two)[0]).toMatchObject({ type: "output", respond: true });
    two.emit("close");
    one.send.mockClear();
    two.send.mockClear();
    output("last");
    expect(frames(one)[0]).toMatchObject({ type: "output", respond: true });
    expect(frames(two)).toEqual([]);
    one.emit(
        "message",
        Buffer.from(JSON.stringify({ type: "response", data: 1 })),
        false,
    );
    expect(session.write).toHaveBeenCalledTimes(4);
    const otherSession = {
        ...session,
        attach: (listener: terminalModule.TerminalAttachmentListener) => {
            listener.data(Buffer.from("separate"));
            return vi.fn();
        },
    };
    const other = socket();
    attachTerminal(other as unknown as WebSocket, otherSession);
    expect(frames(other)[0]).toMatchObject({ type: "output", respond: true });
    one.emit("close");
    other.emit("close");
});

it("ignores unsafe resize values and confines native input failures to their attachment", () => {
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
    });
    const detach = vi.fn();
    const session = {
        attach: () => detach,
        write: vi.fn(() => {
            throw new Error("PTY input failed");
        }),
        resize: vi.fn(),
        kill: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    attachTerminal(socket as unknown as WebSocket, session);
    socket.emit(
        "message",
        Buffer.from(JSON.stringify({ type: "resize", cols: 1e21, rows: 24 })),
        false,
    );
    expect(session.resize).not.toHaveBeenCalled();
    expect(() =>
        socket.emit("message", Buffer.from("input"), true),
    ).not.toThrow();
    expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "error", message: "PTY input failed" }),
    );
    expect(socket.close).toHaveBeenCalledOnce();
    expect(detach).toHaveBeenCalledOnce();
    expect(session.kill).not.toHaveBeenCalled();
});

it("disconnects only a viewer more than 8 MiB behind parsed output and permits snapshot reattachment", () => {
    const listeners: terminalModule.TerminalAttachmentListener[] = [];
    const detaches: ReturnType<typeof vi.fn>[] = [];
    const session = {
        attach: (listener: terminalModule.TerminalAttachmentListener) => {
            listeners.push(listener);
            const off = vi.fn();
            detaches.push(off);
            return off;
        },
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    const peer = () =>
        Object.assign(new EventEmitter(), {
            OPEN: 1,
            readyState: 1,
            send: vi.fn(),
            close: vi.fn(),
        });
    const slow = peer();
    const fast = peer();
    attachTerminal(slow as unknown as WebSocket, session);
    attachTerminal(fast as unknown as WebSocket, session);
    const snapshot = {
        cols: 80,
        rows: 24,
        state: {} as never,
        data: Buffer.alloc(9 * 1024 * 1024),
        tail: [],
    };
    listeners.forEach((listener) => listener.snapshot(snapshot));
    expect(slow.close).not.toHaveBeenCalled();
    const ack = (socket: typeof slow, offset: unknown) =>
        socket.emit(
            "message",
            Buffer.from(JSON.stringify({ type: "ack", offset })),
            false,
        );
    const chunk = Buffer.alloc(4 * 1024 * 1024);
    for (let n = 1; n <= 2; n++) {
        const token = {};
        listeners.forEach((listener) => listener.data(chunk, token));
        ack(fast, n * chunk.length);
    }
    expect(slow.close).not.toHaveBeenCalled();
    ack(slow, 16 * 1024 * 1024); // An ACK for unsent bytes cannot bypass the bound.
    ack(slow, -1);
    ack(slow, 1.5);
    ack(slow, "1048576");
    ack(fast, 8 * 1024 * 1024); // Duplicate ACK is harmless.
    const token = {};
    listeners.forEach((listener) => listener.data(Buffer.from("x"), token));
    expect(slow.close).toHaveBeenCalledWith(
        1013,
        "Terminal output backlog exceeds limit. Reconnect to restore the screen.",
    );
    expect(detaches[0]).toHaveBeenCalledOnce();
    expect(fast.close).not.toHaveBeenCalled();
    expect(session.kill).not.toHaveBeenCalled();
    expect(slow.send).toHaveBeenLastCalledWith(
        JSON.stringify({
            type: "error",
            message:
                "Terminal output backlog exceeds the limit. Reconnect to restore the current screen.",
        }),
    );
    const last = fast.send.mock.calls.at(-2)![0];
    expect(JSON.parse(last)).toMatchObject({
        type: "output",
        offset: 8 * 1024 * 1024 + 1,
    });
    slow.send.mockClear();
    listeners[0]!.data(Buffer.from("ignored"));
    expect(slow.send).not.toHaveBeenCalled();
    const returning = peer();
    attachTerminal(returning as unknown as WebSocket, session);
    listeners[2]!.snapshot(snapshot);
    listeners[2]!.data(Buffer.from("new"));
    expect(returning.close).not.toHaveBeenCalled();
    expect(JSON.parse(returning.send.mock.calls.at(-2)![0])).toMatchObject({
        type: "output",
        offset: 3,
    });
    slow.emit("close");
    fast.emit("close");
    returning.emit("close");
});

it("blocks user input and terminal responses during stop and resumes after refusal", () => {
    const socket = Object.assign(new EventEmitter(), {
        OPEN: 1,
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
    });
    const session = {
        attach: () => () => {},
        write: vi.fn(),
        resize: vi.fn(),
    } as unknown as terminalModule.TerminalSession;
    let enabled = false;
    attachTerminal(socket as unknown as WebSocket, session, () => enabled);
    socket.emit("message", Buffer.from("build\r"), true);
    socket.emit(
        "message",
        Buffer.from(JSON.stringify({ type: "response", data: "reply" })),
        false,
    );
    expect(session.write).not.toHaveBeenCalled();
    enabled = true;
    socket.emit("message", Buffer.from("ls\r"), true);
    expect(session.write).toHaveBeenCalledOnce();
});
