import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as nodePty from "node-pty";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createTerminal,
    defaultShell,
    type TerminalExit,
    type TerminalSession,
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
    (chunk) => {
        let reportData!: (data: string) => void;
        const spawn = vi.spyOn(nodePty, "spawn").mockReturnValue({
            pid: 123,
            onData: (listener: typeof reportData) => {
                reportData = listener;
                return { dispose() {} };
            },
            onExit: () => ({ dispose() {} }),
        } as unknown as ReturnType<typeof nodePty.spawn>);
        try {
            const session = createTerminal({ id: "bytes" });
            const received: Uint8Array[] = [];
            session.subscribe({
                data: (data) => received.push(data),
                exit() {},
            });
            reportData(chunk as string);
            expect(received[0]).toBeInstanceOf(Uint8Array);
            expect(Buffer.from(received[0]!)).toEqual(Buffer.from(chunk));
            expect(Buffer.from(session.snapshot())).toEqual(Buffer.from(chunk));
        } finally {
            spawn.mockRestore();
        }
    },
);

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
        session.resize(100, 40);
        await waitFor("resized", () => viewer.text.includes("40 100"));
    });

    it("replays recent output to a late viewer without gap or repeat", async () => {
        const session = open({
            id: "replay",
            file: "/bin/sh",
            args: ["-c", "printf 'EARLY\\n'; sleep 0.4; printf 'LATE\\n'"],
        });

        await waitFor("early output buffered", () =>
            decoder.decode(session.snapshot()).includes("EARLY"),
        );

        // The daemon reads the snapshot and subscribes in one tick; nothing can
        // interleave, so the viewer sees replay then live with no seam.
        const replay = decoder.decode(session.snapshot());
        const viewer = view(session);

        await waitFor("live output", () => viewer.text.includes("LATE"));
        expect(replay).toContain("EARLY");
        expect(replay).not.toContain("LATE");
        expect(viewer.text).not.toContain("EARLY");
        expect(replay + viewer.text).toContain("EARLY");
    });

    it("keeps the replay buffer under its ceiling", async () => {
        const ceiling = 4096;
        const session = open({
            id: "bounded",
            file: "/bin/sh",
            // ~300 KiB, far past both the test ceiling and the 64 KiB default.
            args: [
                "-c",
                "i=0; while [ $i -lt 300 ]; do printf '%01000d\\n' $i; i=$((i+1)); done; printf 'TAIL\\n'",
            ],
            replayBytes: ceiling,
        });
        const viewer = view(session);

        await waitFor("generator finished", () => viewer.text.includes("TAIL"));
        expect(viewer.text.length).toBeGreaterThan(300_000);

        const snapshot = session.snapshot();
        expect(snapshot.byteLength).toBeLessThanOrEqual(ceiling);
        // Bounded means it keeps the newest bytes, not the oldest.
        expect(decoder.decode(snapshot)).toContain("TAIL");
    });

    it("defaults the replay ceiling to 64 KiB", async () => {
        const session = open({
            id: "default-ceiling",
            file: "/bin/sh",
            args: [
                "-c",
                "i=0; while [ $i -lt 300 ]; do printf '%01000d\\n' $i; i=$((i+1)); done; printf 'TAIL\\n'",
            ],
        });
        const viewer = view(session);

        await waitFor("generator finished", () => viewer.text.includes("TAIL"));
        expect(session.snapshot().byteLength).toBeLessThanOrEqual(64 * 1024);
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
        expect(() => session.snapshot()).not.toThrow();
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
