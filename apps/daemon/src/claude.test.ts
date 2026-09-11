import { access, copyFile, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";

import { expect, test, vi } from "vitest";

import { ClaudeBinding } from "@/claude";
import * as inbox from "@/claude-inbox";

test("a registered binding can stop before spawn and never starts afterward", async () => {
    const binding = new ClaudeBinding({
        runtimeId: "runtime",
        setActivity: vi.fn(),
        settle: vi.fn(),
    });
    await binding.stop(true);
    await expect(
        binding.start({
            args: [],
            env: {},
            cwd: process.cwd(),
            cols: 80,
            rows: 24,
        }),
    ).rejects.toThrow(/stopped/);
});

test("binding readiness requires authenticated hook metadata and a live inbox", async () => {
    const controls = { runtimeId: "r", setActivity: vi.fn(), settle: vi.fn() };
    const binding = new ClaudeBinding(controls);
    await expect(
        binding.observe({
            event: { hook_event_name: "SessionStart" },
            inboxPath: "/wrong",
            inboxToken: "token",
        }),
    ).rejects.toThrow(/inbox/);
    expect(controls.setActivity).not.toHaveBeenCalledWith("idle");
    await binding.stop(true);
});

test.skipIf(process.platform === "win32")(
    "stop waits for in-progress inbox directory preparation and removes the resulting directory",
    async () => {
        const binding = new ClaudeBinding({
            runtimeId: "prepare-race",
            setActivity: vi.fn(),
            settle: vi.fn(),
        });
        const preparing = binding.prepare();
        const preparationFailed = expect(preparing).rejects.toThrow(/stopped/);
        const stopping = binding.stop(true);
        await preparationFailed;
        await stopping;
        expect(binding.inboxPath).not.toBe("");
        await expect(access(dirname(binding.inboxPath))).rejects.toMatchObject({
            code: "ENOENT",
        });
        await binding.stop(true);
    },
);

test("stops and observes a real Node vendor stand-in launched through the caller PATH", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-child-"));
    const executable = join(
        directory,
        process.platform === "win32" ? "claude.exe" : "claude",
    );
    if (process.platform === "win32")
        await copyFile(process.execPath, executable);
    else await symlink(process.execPath, executable);
    const binding = new ClaudeBinding({
        runtimeId: "real-child",
        setActivity: vi.fn(),
        settle: vi.fn(),
    });
    try {
        await binding.prepare();
        const env = Object.fromEntries(
            Object.entries(process.env).filter(
                (entry): entry is [string, string] =>
                    entry[1] !== undefined && entry[0].toUpperCase() !== "PATH",
            ),
        );
        let output = "";
        await binding.start({
            args: [
                "-e",
                "require('node:net').createServer(socket => { socket.on('error', () => {}); socket.resume(); }).listen(process.env.TEST_INBOX, () => console.log('AIOX_NODE_READY'));",
            ],
            env: {
                ...env,
                PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
                TEST_INBOX: binding.inboxPath,
            },
            cwd: directory,
            cols: 80,
            rows: 24,
            initialListener: {
                data: (bytes) => {
                    output += Buffer.from(bytes).toString();
                },
                exit: () => {},
            },
        });
        const session = binding.session!;
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                detach();
                reject(
                    new Error(`Node vendor did not become ready: ${output}`),
                );
            }, 3000);
            const detach = session.subscribe({
                data: () => {
                    if (output.includes("AIOX_NODE_READY")) {
                        clearTimeout(timer);
                        detach();
                        resolve();
                    }
                },
                exit: () => {
                    clearTimeout(timer);
                    detach();
                    reject(
                        new Error(
                            `Node vendor exited before readiness: ${output}`,
                        ),
                    );
                },
            });
            if (output.includes("AIOX_NODE_READY")) {
                clearTimeout(timer);
                detach();
                resolve();
            }
        });
        await binding.observe({
            inboxPath: binding.inboxPath,
            inboxToken: "node-inbox-token",
            event: {
                hook_event_name: "SessionStart",
                session_id: "node-session",
            },
        });
        expect(binding.ready).toBe(true);
        expect(session.alive).toBe(true);
        const exited = vi.fn();
        session.subscribe({ data: () => {}, exit: exited });
        await binding.stop(true);
        expect(exited).toHaveBeenCalledOnce();
        expect(session.alive).toBe(false);
        if (process.platform !== "win32")
            await expect(
                access(dirname(binding.inboxPath)),
            ).rejects.toMatchObject({ code: "ENOENT" });
        await binding.stop(true);
    } finally {
        await binding.stop(true);
        await rm(directory, { recursive: true, force: true });
    }
}, 10_000);

test("external hook and MCP may arrive before started without a PTY and cleanup preserves caller files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-external-"));
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const binding = new ClaudeBinding(
        { runtimeId: "external", setActivity: vi.fn(), settle: vi.fn() },
        join(directory, "inbox.sock"),
    );
    binding.requireMcp = true;
    try {
        await binding.observe({
            inboxPath: binding.inboxPath,
            inboxToken: "secret",
            event: { hook_event_name: "SessionStart", session_id: "s" },
        });
        binding.mcpConnected();
        expect(binding.ready).toBe(false);
        binding.externalStarted();
        expect(binding.ready).toBe(true);
        expect(binding.session).toBeUndefined();
        await binding.cleanup();
        expect(binding.ready).toBe(false);
        await expect(access(directory)).resolves.toBeUndefined();
        await expect(binding.observe({ event: {} })).rejects.toThrow(/stopped/);
    } finally {
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});
