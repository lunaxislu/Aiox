import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as nodePty from "node-pty";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createTerminal,
    defaultShell,
    type TerminalExit,
    type TerminalSession,
    type TerminalSnapshot,
} from "./index";

const decoder = new TextDecoder();

const opened: TerminalSession[] = [];

/** Every session is server owned, so the suite has to hand each one back. */
function open(options: Parameters<typeof createTerminal>[0]): TerminalSession {
    const session = createTerminal(options);
    opened.push(session);
    return session;
}

type Viewer = {
    text: string;
    chunks: number;
    exits: TerminalExit[];
    off: () => void;
};

function view(session: TerminalSession): Viewer {
    const viewer: Viewer = { text: "", chunks: 0, exits: [], off: () => {} };
    viewer.off = session.subscribe({
        data(chunk) {
            viewer.text += decoder.decode(chunk, { stream: true });
            viewer.chunks += 1;
        },
        exit(event) {
            viewer.exits.push(event);
        },
    });
    return viewer;
}

async function waitFor(
    what: string,
    predicate: () => boolean,
    timeoutMs = 8_000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (predicate()) return;
        if (Date.now() > deadline)
            throw new Error(`timed out waiting: ${what}`);
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
}

/** EPERM means the pid exists but belongs to somebody else. */
function processAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

function tempDir(): string {
    // macOS hands out /var/... symlinks that `pwd` reports as /private/var/...
    return realpathSync(mkdtempSync(join(tmpdir(), "aiox-pty-")));
}

afterEach(async () => {
    await Promise.all(opened.splice(0).map((session) => session.kill()));
});

describe("defaultShell", () => {
    it("names an absolute interactive shell for this platform", () => {
        const shell = defaultShell();
        expect(shell.file.length).toBeGreaterThan(0);
        expect(Array.isArray(shell.args)).toBe(true);
    });
});

it.each(["한글\u001b[31m", Buffer.from([0xff, 0x1b, 0x5b, 0x6d])])(
    "delivers PTY output as bytes to live viewers and replay: %s",
    async (chunk) => {
        let reportData!: (data: string) => void;
        const pty = {
            pid: 0,
            onData: (listener: typeof reportData) => {
                reportData = listener;
                return { dispose() {} };
            },
            onExit: () => ({ dispose() {} }),
        };
        const spawn = vi
            .spyOn(nodePty, "spawn")
            .mockReturnValue(
                pty as unknown as ReturnType<typeof nodePty.spawn>,
            );
        try {
            const session = createTerminal({ id: "bytes" });
            pty.pid = 123;
            expect(session.pid).toBe(123);
            const received: Uint8Array[] = [];
            session.subscribe({
                data: (data) => received.push(data),
                exit() {},
            });
            reportData(chunk as string);
            expect(received[0]).toBeInstanceOf(Uint8Array);
            expect(Buffer.from(received[0]!)).toEqual(Buffer.from(chunk));
            let off = () => {};
            const captured = await new Promise<TerminalSnapshot>(
                (resolve, reject) => {
                    off = session.attach({
                        snapshot: resolve,
                        data() {},
                        resize() {},
                        exit() {},
                        error: reject,
                    });
                },
            );
            off();
            expect(captured.cols).toBe(80);
            expect(captured.state.cursorBlink).toBe(true);
            expect(captured.data).toBeInstanceOf(Uint8Array);
        } finally {
            spawn.mockRestore();
        }
    },
);

it("registers the initial foreground listener before the first PTY output", () => {
    const data = vi.fn();
    const spawn = vi.spyOn(nodePty, "spawn").mockReturnValue({
        pid: 123,
        onData(listener: (chunk: string) => void) {
            listener("FIRST");
            return { dispose() {} };
        },
        onExit: () => ({ dispose() {} }),
    } as unknown as ReturnType<typeof nodePty.spawn>);
    try {
        createTerminal({ id: "initial", initialListener: { data, exit() {} } });
        expect(data).toHaveBeenCalledTimes(1);
        expect(Buffer.from(data.mock.calls[0]![0]).toString()).toBe("FIRST");
    } finally {
        spawn.mockRestore();
    }
});

it("orders snapshot, concurrent output, resize and exit at one attachment boundary", async () => {
    let output!: (value: string) => void;
    let exit!: (value: { exitCode: number }) => void;
    const spawn = vi.spyOn(nodePty, "spawn").mockReturnValue({
        pid: 123,
        onData(fn: typeof output) {
            output = fn;
            return { dispose() {} };
        },
        onExit(fn: typeof exit) {
            exit = fn;
            return { dispose() {} };
        },
        resize() {},
    } as unknown as ReturnType<typeof nodePty.spawn>);
    try {
        const session = createTerminal({ id: "ordered" });
        output("BEFORE");
        const events: string[] = [];
        let outputFrame: object | undefined;
        session.subscribe({
            data(_chunk, frame) {
                outputFrame = frame;
            },
            exit() {},
        });
        const finished = new Promise<void>((resolve, reject) => {
            session.attach({
                snapshot(value) {
                    expect(decoder.decode(value.data)).toContain("BEFORE");
                    events.push("snapshot");
                },
                data(value, frame) {
                    expect(frame).toBe(outputFrame);
                    events.push(decoder.decode(value));
                },
                resize(cols, rows) {
                    events.push(`${cols}x${rows}`);
                },
                exit() {
                    events.push("exit");
                    resolve();
                },
                error: reject,
            });
        });
        output("AFTER");
        session.resize(100, 30);
        exit({ exitCode: 0 });
        await session.dispose();
        await finished;
        const retired = vi.fn();
        session.attach({
            snapshot: retired,
            data() {},
            resize() {},
            exit() {},
            error: retired,
        });
        await Promise.resolve();
        await Promise.resolve();
        expect(retired).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Terminal mirror is disposed.",
            }),
            true,
        );
        expect(events).toEqual(["snapshot", "AFTER", "100x30", "exit"]);
    } finally {
        spawn.mockRestore();
    }
});

it("keeps live output after restore overflow and permits a fresh attach after recovery", async () => {
    let output!: (value: string) => void;
    const spawn = vi.spyOn(nodePty, "spawn").mockReturnValue({
        pid: 123,
        onData(fn: typeof output) {
            output = fn;
            return { dispose() {} };
        },
        onExit() {
            return { dispose() {} };
        },
        pause() {},
        resume() {},
    } as unknown as ReturnType<typeof nodePty.spawn>);
    try {
        const session = createTerminal({ id: "overflow" });
        const live = vi.fn();
        session.subscribe({ data: live, exit() {} });
        output("\x1b]999;" + "x".repeat(1024 * 1024));
        const failure = await new Promise<Error>((resolve) =>
            session.attach({
                snapshot() {
                    throw Error("unexpected snapshot");
                },
                data() {},
                resize() {},
                exit() {},
                error: resolve,
            }),
        );
        expect(failure.message).toContain("replay limit");
        expect(session.alive).toBe(true);
        output("\x07RECOVERED");
        let off = () => {};
        const captured = await new Promise<TerminalSnapshot>(
            (resolve, reject) => {
                off = session.attach({
                    snapshot: resolve,
                    data() {},
                    resize() {},
                    exit() {},
                    error: reject,
                });
            },
        );
        off();
        expect(decoder.decode(captured.data)).toContain("RECOVERED");
        expect(captured.tail).toEqual([]);
        expect(live).toHaveBeenCalledTimes(2);
    } finally {
        spawn.mockRestore();
    }
});

it("retries an unconfirmed termination while sharing each concurrent attempt", async () => {
    vi.useFakeTimers();
    let reportExit!: (event: { exitCode: number; signal?: number }) => void;
    const kill = vi.fn();
    const spawn = vi.spyOn(nodePty, "spawn").mockReturnValue({
        pid: 123,
        onData: () => ({ dispose() {} }),
        onExit: (listener: typeof reportExit) => {
            reportExit = listener;
            return { dispose() {} };
        },
        kill,
    } as unknown as ReturnType<typeof nodePty.spawn>);
    try {
        const session = createTerminal({ id: "retry" });
        const first = session.kill();
        expect(session.kill()).toBe(first);
        const failed = expect(first).rejects.toThrow("not confirmed dead");
        await vi.advanceTimersByTimeAsync(4_000);
        await failed;
        expect(kill).toHaveBeenCalledTimes(2);
        expect(session.alive).toBe(true);

        const second = session.kill();
        expect(second).not.toBe(first);
        expect(session.kill()).toBe(second);
        expect(kill).toHaveBeenCalledTimes(3);
        reportExit({ exitCode: 0, signal: 15 });
        await expect(second).resolves.toEqual({ exitCode: 0, signal: 15 });
        expect(session.alive).toBe(false);
    } finally {
        spawn.mockRestore();
        vi.useRealTimers();
    }
});

// Keep transport/process checks native; only unconfirmed-exit timing is simulated.
describe.skipIf(process.platform === "win32")("createTerminal", () => {
    it("streams pty output to a subscriber and runs in the given cwd", async () => {
        const cwd = tempDir();
        const session = open({
            id: "marker",
            file: "/bin/sh",
            args: ["-c", "printf 'MARKER-%s\\n' 42; pwd"],
            cwd,
        });
        const viewer = view(session);

        expect(session.id).toBe("marker");
        expect(session.pid).toBeGreaterThan(0);
        expect(session.alive).toBe(true);

        await waitFor("marker output", () => viewer.text.includes("MARKER-42"));
        await waitFor("cwd output", () => viewer.text.includes(cwd));
    });

    it("fans output out to every subscriber and survives one leaving", async () => {
        const session = open({
            id: "fanout",
            file: "/bin/sh",
            args: ["-c", "while :; do printf 'tick\\n'; sleep 0.05; done"],
        });
        const first = view(session);
        const second = view(session);

        await waitFor(
            "both viewers attached",
            () => first.text.includes("tick") && second.text.includes("tick"),
        );

        first.off();
        const frozen = first.text;
        const seen = second.chunks;

        // Closing a browser tab is not a stop request.
        await waitFor(
            "remaining viewer keeps reading",
            () => second.chunks > seen + 1,
        );
        expect(first.text).toBe(frozen);
        expect(session.alive).toBe(true);
        expect(processAlive(session.pid)).toBe(true);
    });

    it("resizes the pty so the child sees the new window size", async () => {
        const session = open({
            id: "resize",
            file: "/bin/sh",
            args: ["-c", "while :; do stty size; sleep 0.05; done"],
            cols: 80,
            rows: 24,
        });
        const viewer = view(session);

        await waitFor("initial size", () => viewer.text.includes("24 80"));

        viewer.text = "";
        expect([session.cols, session.rows]).toEqual([80, 24]);
        session.resize(100, 40);
        expect([session.cols, session.rows]).toEqual([100, 40]);
        await waitFor("resized", () => viewer.text.includes("40 100"));
    });

    it("attaches snapshot and subsequent output without gaps or repeats", async () => {
        const session = open({
            id: "replay",
            file: "/bin/sh",
            args: [
                "-c",
                "printf 'EARLY\\n'; read -r release; printf 'LATE\\n'",
            ],
        });
        const observer = view(session);
        await waitFor("early output", () => observer.text.includes("EARLY"));
        let snapshot = "";
        let live = "";
        let error: Error | undefined;
        const off = session.attach({
            snapshot(value) {
                snapshot = decoder.decode(value.data);
                // Release the child only after the snapshot boundary is established.
                session.write("\r");
            },
            data(chunk) {
                live += decoder.decode(chunk);
            },
            resize() {},
            exit() {},
            error(value) {
                error = value;
            },
        });
        await waitFor("late output", () => live.includes("LATE") || !!error);
        expect(error).toBeUndefined();
        expect(snapshot).toContain("EARLY");
        expect(snapshot).not.toContain("LATE");
        expect(live).not.toContain("EARLY");
        off();
    });

    it("cancels an attachment during snapshot preparation", async () => {
        const session = open({
            id: "cancel",
            file: "/bin/sh",
            args: ["-c", "sleep 0.1"],
        });
        const called = vi.fn();
        const off = session.attach({
            snapshot: called,
            data: called,
            resize: called,
            exit: called,
            error: called,
        });
        off();
        await session.kill();
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(called).not.toHaveBeenCalled();
    });

    it("kills a running process and confirms it is gone", async () => {
        const session = open({
            id: "kill",
            file: "/bin/sh",
            args: ["-c", "while :; do sleep 0.05; done"],
        });
        const viewer = view(session);
        const { pid } = session;

        const exit = await session.kill();

        expect(session.alive).toBe(false);
        expect(processAlive(pid)).toBe(false);
        expect(exit.signal).toBe(15);
        await waitFor("exit delivered", () => viewer.exits.length === 1);
        expect(viewer.exits[0]).toEqual(exit);

        // A second stop request must not throw or hang.
        await expect(session.kill()).resolves.toEqual(exit);
    });

    it("escalates to SIGKILL when the child ignores SIGTERM", async () => {
        const session = open({
            id: "stubborn",
            file: "/bin/sh",
            args: [
                "-c",
                "trap '' TERM; printf 'READY\\n'; while :; do sleep 0.05; done",
            ],
        });
        const viewer = view(session);
        const { pid } = session;

        // The trap has to be installed before the signal arrives.
        await waitFor("trap installed", () => viewer.text.includes("READY"));

        const exit = await session.kill();

        expect(exit.signal).toBe(9);
        expect(session.alive).toBe(false);
        expect(processAlive(pid)).toBe(false);
    }, 15_000);

    it("stays usable after the process is gone", async () => {
        const session = open({
            id: "after-exit",
            file: "/bin/sh",
            args: ["-c", "exit 3"],
        });
        const viewer = view(session);

        await waitFor("natural exit", () => viewer.exits.length === 1);
        expect(session.alive).toBe(false);
        expect(viewer.exits[0]).toEqual({ exitCode: 3, signal: null });

        expect(() => session.write("still typing\r")).not.toThrow();
        expect(() => session.resize(120, 40)).not.toThrow();
    });

    it("hands a viewer that attaches after exit the exit event", async () => {
        const session = open({
            id: "late-attach",
            file: "/bin/sh",
            args: ["-c", "exit 0"],
        });
        await session.kill();

        const late = view(session);
        await waitFor("late exit delivered", () => late.exits.length === 1);
        expect(late.exits[0]?.exitCode).toBe(0);
        expect(() => late.off()).not.toThrow();
    });

    it("delivers input typed by a viewer to the child", async () => {
        const session = open({
            id: "input",
            file: "/bin/sh",
            args: ["-c", "read line; printf 'GOT:%s\\n' \"$line\""],
        });
        const viewer = view(session);

        session.write("hello-pty\r");
        await waitFor("echoed input", () =>
            viewer.text.includes("GOT:hello-pty"),
        );
    });
});

it("pauses PTY reads while mirror parsing lags and resumes after success or failure", async () => {
    let output!: (value: string) => void;
    let exit!: (value: { exitCode: number; signal: number }) => void;
    const pty = {
        pid: 123,
        onData(fn: typeof output) {
            output = fn;
            return { dispose() {} };
        },
        onExit(fn: typeof exit) {
            exit = fn;
            return { dispose() {} };
        },
        kill() {
            exit({ exitCode: 0, signal: 15 });
        },
        pause: vi.fn(),
        resume: vi.fn(),
    };
    const spawn = vi
        .spyOn(nodePty, "spawn")
        .mockReturnValue(pty as unknown as ReturnType<typeof nodePty.spawn>);
    const boundary = await import("./boundary");
    const writes: { resolve(): void; reject(error: Error): void }[] = [];
    const write = vi
        .spyOn(boundary.MirrorBoundary.prototype, "write")
        .mockImplementation(
            () =>
                new Promise<void>((resolve, reject) =>
                    writes.push({ resolve, reject }),
                ),
        );
    try {
        const session = createTerminal({ id: "backpressure" });
        const chunk = "x".repeat(512 * 1024);
        output(chunk);
        output(chunk);
        output(chunk);
        expect(pty.pause).toHaveBeenCalledOnce();
        writes[0]!.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        expect(pty.resume).not.toHaveBeenCalled();
        writes[1]!.reject(new Error("parser failed"));
        await new Promise((resolve) => setImmediate(resolve));
        expect(pty.resume).toHaveBeenCalledOnce();
        writes[2]!.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        output(chunk);
        output(chunk);
        expect(pty.pause).toHaveBeenCalledTimes(2);
        await session.kill();
        writes[3]!.resolve();
        writes[4]!.resolve();
        await new Promise((resolve) => setImmediate(resolve));
        expect(pty.resume).toHaveBeenCalledOnce();
        await session.dispose();
    } finally {
        spawn.mockRestore();
        write.mockRestore();
    }
});

it.skipIf(process.platform === "win32")(
    "confirms idle exit even when lifecycle disposal removes the shell acknowledgement",
    async () => {
        const home = mkdtempSync(join(tmpdir(), "aiox-idle-exit-"));
        writeFileSync(join(home, ".bashrc"), "PS1='IDLE_EXIT> '\n");
        const session = open({
            id: "idle-exit",
            file: "/bin/bash",
            shellIntegration: true,
            env: {
                ...process.env,
                HOME: home,
                TERM: "dumb",
            } as Record<string, string>,
        });
        const viewer = view(session);
        session.subscribe({
            data() {},
            exit() {
                void session.dispose();
            },
        });
        try {
            await expect
                .poll(() => viewer.text.includes("IDLE_EXIT> "))
                .toBe(true);
            expect(await session.closeIdle()).toBe(true);
            expect(session.alive).toBe(false);
        } finally {
            await session.kill();
            await session.dispose();
            rmSync(home, { recursive: true, force: true });
        }
    },
);

it("keeps the PTY alive and marks every attach unrestorable after a mirror write failure", async () => {
    const { default: headless } = await import("@xterm/headless");
    let output!: (value: string) => void;
    let exit!: (value: { exitCode: number }) => void;
    const pty = {
        pid: 123,
        onData(fn: typeof output) {
            output = fn;
            return { dispose() {} };
        },
        onExit(fn: typeof exit) {
            exit = fn;
            return { dispose() {} };
        },
        write: vi.fn(),
        pause() {},
        resume() {},
        kill: vi.fn(() => exit({ exitCode: 0 })),
    };
    const spawn = vi
        .spyOn(nodePty, "spawn")
        .mockReturnValue(pty as unknown as ReturnType<typeof nodePty.spawn>);
    const write = vi
        .spyOn(headless.Terminal.prototype, "write")
        .mockImplementationOnce(() => {
            throw new Error("mirror storage failed");
        });
    const session = createTerminal({ id: "broken-mirror" });
    try {
        const live = vi.fn();
        session.subscribe({ data: live, exit() {} });
        output("first");
        await new Promise((resolve) => setImmediate(resolve));
        for (let attempt = 0; attempt < 2; attempt++) {
            const failure = vi.fn();
            session.attach({
                snapshot: vi.fn(),
                data() {},
                resize() {},
                exit() {},
                error: failure,
            });
            await vi.waitFor(() => expect(failure).toHaveBeenCalled());
            expect(failure).toHaveBeenCalledWith(
                expect.objectContaining({ message: "mirror storage failed" }),
                false,
            );
            expect(session.alive).toBe(true);
            expect(pty.kill).not.toHaveBeenCalled();
        }
        output("later");
        session.write("input");
        expect(live).toHaveBeenCalledTimes(2);
        expect(pty.write).toHaveBeenCalledWith("input");
    } finally {
        await session.kill();
        await session.dispose();
        write.mockRestore();
        spawn.mockRestore();
    }
});

it("advertises xterm capabilities instead of the daemon's outer terminal", async () => {
    const session = open({
        id: "terminal-environment",
        file: process.execPath,
        args: [
            "-e",
            "console.log(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(TERM(?:_|$)|COLORTERM|GHOSTTY|KITTY|WEZTERM|ITERM|TMUX|STY|AIOX_TEST)/.test(k)))))",
        ],
        env: {
            ...process.env,
            TERM: "xterm-ghostty",
            TERM_PROGRAM: "ghostty",
            TERM_PROGRAM_VERSION: "1.3",
            GHOSTTY_RESOURCES_DIR: "/outer/ghostty",
            GHOSTTY_BIN_DIR: "/outer/bin",
            KITTY_WINDOW_ID: "1",
            WEZTERM_PANE: "2",
            WEZTERM_VERSION: "3",
            ITERM_SESSION_ID: "outer",
            TMUX: "/outer/tmux",
            STY: "outer",
            COLORTERM: "24bit",
            AIOX_TEST_PRESERVED: "yes",
        },
    });
    const viewer = view(session);
    await waitFor("terminal environment", () => viewer.exits.length > 0);
    expect(JSON.parse(viewer.text.trim())).toEqual({
        TERM: "xterm-256color",
        TERM_PROGRAM: "aiox",
        COLORTERM: "truecolor",
        AIOX_TEST_PRESERVED: "yes",
    });
});
