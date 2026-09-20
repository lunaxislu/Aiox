import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import {
    appendFile,
    mkdir,
    mkdtemp,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { InvalidVendorReport } from "@aiox/vendor";
import { expect, test, vi } from "vitest";

import { ClaudeBinding } from "@/claude";
import * as inbox from "@/claude-inbox";

vi.mock("node:fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:fs")>();
    return { ...actual, watch: vi.fn(actual.watch) };
});

const controls = () => ({
    runtimeId: "runtime",
    setStatus: vi.fn(),
    setObservationError: vi.fn(),
    settle: vi.fn(),
});
const report = {
    ppid: 1234,
    inboxPath: "/assigned",
    inboxToken: "secret",
    event: { hook_event_name: "Notification", session_id: "session" },
};

test("released bindings cannot become ready or accept hook reports", async () => {
    const binding = new ClaudeBinding(controls(), "/assigned");
    await binding.cleanup("execution_stopped");
    expect(() => binding.executionStarted()).toThrow(/stopped/);
    await expect(binding.observe(report)).rejects.toThrow(/stopped/);
});

test("readiness requires valid session initialization, inbox, MCP and execution start", async () => {
    const f = await fixture();
    f.binding.requireMcp = true;
    const ready = vi.fn();
    f.binding.onReady = ready;
    try {
        await expect(
            f.binding.observe({ ...report, inboxPath: "/wrong" }),
        ).rejects.toThrow(/inbox/);
        await f.binding.observe(report);
        f.binding.mcpConnected();
        f.binding.executionStarted();
        expect(ready).not.toHaveBeenCalled();
        expect(f.control.setStatus).not.toHaveBeenCalled();
        await f.start();
        await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
        await expect(
            f.binding.observe({ ...report, inboxToken: "changed" }),
        ).rejects.toThrow(/credential changed/);
        await f.binding.cleanup("external_connection_lost");
        expect(() => f.binding.executionStarted()).toThrow(/stopped/);
    } finally {
        await f.close();
    }
});

test("revocation during an inbox check cannot publish late readiness", async () => {
    let complete!: () => void;
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockImplementation(
        () =>
            new Promise<void>((resolve) => {
                complete = resolve;
            }),
    );
    const binding = new ClaudeBinding(controls(), "/assigned");
    const ready = vi.fn();
    binding.onReady = ready;
    binding.executionStarted();
    try {
        const pending = binding.observe(report);
        await binding.cleanup("external_connection_lost");
        complete();
        await expect(pending).rejects.toThrow(/exited/);
        expect(ready).not.toHaveBeenCalled();
    } finally {
        probe.mockRestore();
    }
});

test("malformed vendor reports are distinguished from valid reports with invalid inbox credentials", async () => {
    const binding = new ClaudeBinding(controls(), "/assigned");
    await expect(binding.observe({ event: {} })).rejects.toBeInstanceOf(
        InvalidVendorReport,
    );
    await expect(
        binding.observe({ ...report, inboxPath: "/wrong" }),
    ).rejects.not.toBeInstanceOf(InvalidVendorReport);
});

test("waits for the reported parent PID registry to match before becoming ready", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const directory = await mkdtemp(join(tmpdir(), "aiox-registry-pid-"));
    const path = join(directory, "projects", "project", "session.jsonl");
    const registry = join(directory, "sessions", "1234.json");
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    const ready = vi.fn();
    binding.onReady = ready;
    binding.executionStarted();
    try {
        await mkdir(dirname(registry), { recursive: true });
        await writeFile(registry, JSON.stringify({ sessionId: "other" }));
        await writeFile(
            join(dirname(registry), "9999.json"),
            JSON.stringify({ sessionId: "session" }),
        );
        await expect(
            binding.observe({
                ...report,
                event: {
                    ...report.event,
                    hook_event_name: "SessionStart",
                    transcript_path: path,
                },
            }),
        ).resolves.toBeUndefined();
        expect(ready).not.toHaveBeenCalled();
        await writeFile(
            registry,
            JSON.stringify({ sessionId: "session", status: "busy" }),
        );
        await vi.waitFor(() => expect(ready).toHaveBeenCalledOnce());
        expect(control.setStatus).toHaveBeenLastCalledWith(
            "working",
            undefined,
        );
    } finally {
        await binding.cleanup("execution_stopped");
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});

test("discards the old session and resumes from a fresh EOF", async () => {
    const f = await fixture();
    try {
        await f.start("old");
        const old = f.track("old-delivery");
        await f.binding.observations.observeTranscript(
            JSON.parse(terminalRows("old", "started", old).split("\n")[0]!),
        );
        await f.start("new");
        await vi.waitFor(() =>
            expect(f.control.settle).toHaveBeenCalledExactlyOnceWith(
                "old-delivery",
                "interrupted",
            ),
        );
        await writeFile(f.path("old"), terminalRows("old", "late", old));
        await f.binding.observe({
            ...report,
            event: {
                hook_event_name: "StopFailure",
                session_id: "old",
                prompt_id: "late",
                error: "late",
            },
        });
        await f.start("old", "resume");
        const fresh = f.track("fresh-delivery");
        await appendFile(f.path("old"), terminalRows("old", "fresh", fresh));
        await vi.waitFor(() =>
            expect(f.control.settle).toHaveBeenLastCalledWith(
                "fresh-delivery",
                "completed",
            ),
        );
        expect(f.control.settle).toHaveBeenCalledTimes(2);
    } finally {
        await f.close();
    }
});

test("reattaches after a watch error and reads missed rows without another change event", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const failedWatch = Object.assign(new EventEmitter(), {
        close: vi.fn(),
        ref: vi.fn().mockReturnThis(),
        unref: vi.fn().mockReturnThis(),
    }) as fs.FSWatcher;
    const watcher = vi
        .spyOn(fs, "watch")
        .mockImplementationOnce(() => failedWatch);
    watcher.mockClear();
    const directory = await mkdtemp(join(tmpdir(), "aiox-watch-recovery-"));
    const path = join(directory, "projects", "project", "session.jsonl");
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    binding.executionStarted();
    const consume = vi.spyOn(binding.observations, "observeTranscript");
    try {
        await mkdir(dirname(path), { recursive: true });
        await mkdir(join(directory, "sessions"));
        await writeFile(
            join(directory, "sessions", "1234.json"),
            JSON.stringify({ sessionId: "session", status: "idle" }),
        );
        await writeFile(path, "");
        await binding.observe({
            ...report,
            event: {
                ...report.event,
                hook_event_name: "SessionStart",
                transcript_path: path,
            },
        });
        failedWatch.emit("error", new Error("watch unavailable"));
        expect(control.setObservationError).toHaveBeenLastCalledWith(
            expect.stringContaining("watch unavailable"),
        );
        expect(control.setStatus).not.toHaveBeenCalledWith(
            "failed",
            expect.anything(),
        );
        await appendFile(path, completedRows("session", "missed"));
        await vi.waitFor(() => expect(consume).toHaveBeenCalledTimes(3), {
            timeout: 3000,
        });
        expect(control.setObservationError).toHaveBeenLastCalledWith(null);
        expect(
            watcher.mock.calls.filter((call) => call[0] === path),
        ).toHaveLength(2);
        expect(failedWatch.close).toHaveBeenCalledOnce();
    } finally {
        await binding.cleanup("execution_stopped");
        watcher.mockRestore();
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});

test("registry file changes drive screen state and attach a transcript created after SessionStart", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const directory = await mkdtemp(join(tmpdir(), "aiox-registry-watch-"));
    const path = join(directory, "projects", "project", "session.jsonl");
    const registry = join(directory, "sessions", "1234.json");
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    const update = (status: string, waitingFor?: string) =>
        writeFile(
            registry,
            JSON.stringify({ sessionId: "session", status, waitingFor }),
        );
    binding.executionStarted();
    try {
        await mkdir(dirname(registry), { recursive: true });
        await mkdir(dirname(path), { recursive: true });
        await update("idle");
        await binding.observe({
            ...report,
            event: {
                ...report.event,
                hook_event_name: "SessionStart",
                transcript_path: path,
            },
        });
        await vi.waitFor(() =>
            expect(control.setStatus).toHaveBeenCalledWith("idle", undefined),
        );
        await binding.deliver({
            deliveryId: "delivery",
            from: { name: "sender", role: null, description: null },
            createdAt: 1,
            content: "work",
        });
        const frame = probe.mock.lastCall![2]!;
        await update("busy");
        await vi.waitFor(() =>
            expect(control.setStatus.mock.lastCall?.[0]).toBe("working"),
        );
        await update("waiting", "permission prompt");
        await vi.waitFor(() =>
            expect(control.setStatus.mock.lastCall).toEqual([
                "awaiting-user",
                "Waiting for approval.",
            ]),
        );
        await update("idle");
        await vi.waitFor(() =>
            expect(control.setStatus.mock.lastCall?.[0]).toBe("idle"),
        );
        expect(control.settle).not.toHaveBeenCalled();
        const rows = completedRows("session", "peer")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        rows[0].origin = {
            kind: "peer",
            name: "sender",
            body: frame.slice(frame.indexOf("\n") + 1, frame.lastIndexOf("\n")),
        };
        await writeFile(
            path,
            rows.map((row) => JSON.stringify(row) + "\n").join(""),
        );
        await update("idle");
        await vi.waitFor(() =>
            expect(control.settle).toHaveBeenCalledExactlyOnceWith(
                "delivery",
                "completed",
            ),
        );
    } finally {
        await binding.cleanup("execution_stopped");
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});

test("recovers registry replacement and ignores a registry for an unselected session", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const directory = await mkdtemp(join(tmpdir(), "aiox-registry-replace-"));
    const path = join(directory, "projects", "project", "session.jsonl");
    const registry = join(directory, "sessions", "1234.json");
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    const write = (sessionId: string, status: string) =>
        writeFile(registry, JSON.stringify({ sessionId, status }));
    binding.executionStarted();
    try {
        await mkdir(dirname(registry), { recursive: true });
        await write("session", "busy");
        await binding.observe({
            ...report,
            event: {
                ...report.event,
                hook_event_name: "SessionStart",
                transcript_path: path,
            },
        });
        await vi.waitFor(() =>
            expect(control.setStatus.mock.lastCall?.[0]).toBe("working"),
        );
        await rename(registry, `${registry}.old`);
        await vi.waitFor(() =>
            expect(control.setObservationError).toHaveBeenLastCalledWith(
                "Claude registry observation failed.",
            ),
        );
        await write("session", "idle");
        await vi.waitFor(
            () => expect(control.setStatus.mock.lastCall?.[0]).toBe("idle"),
            { timeout: 4000 },
        );
        control.setStatus.mockClear();
        await write("different", "busy");
        // The selected session remains unchanged while registry updates race the hook queue.
        await binding.observe({
            ...report,
            event: { hook_event_name: "Stop", session_id: "session" },
        });
        await write("session", "waiting");
        await vi.waitFor(() =>
            expect(control.setStatus.mock.lastCall?.[0]).toBe("awaiting-user"),
        );
        expect(
            control.setStatus.mock.calls.some(
                ([status]) => status === "working",
            ),
        ).toBe(false);
    } finally {
        await binding.cleanup("execution_stopped");
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});

test("follows transcript relocation without CwdChanged or FileChanged hooks and keeps its cursor", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const directory = await mkdtemp(join(tmpdir(), "aiox-direct-relocate-"));
    const path = join(directory, "projects", "before", "session.jsonl");
    const moved = join(directory, "projects", "after", "session.jsonl");
    const registry = join(directory, "sessions", "1234.json");
    const binding = new ClaudeBinding(controls(), "/assigned");
    const consume = vi.spyOn(binding.observations, "observeTranscript");
    binding.executionStarted();
    try {
        await mkdir(dirname(path), { recursive: true });
        await mkdir(dirname(moved), { recursive: true });
        await mkdir(dirname(registry), { recursive: true });
        await writeFile(
            registry,
            JSON.stringify({ sessionId: "session", status: "idle" }),
        );
        await writeFile(path, "");
        await binding.observe({
            ...report,
            event: {
                ...report.event,
                hook_event_name: "SessionStart",
                transcript_path: path,
            },
        });
        await appendFile(path, completedRows("session", "first"));
        await vi.waitFor(() => expect(consume).toHaveBeenCalledTimes(3));
        await rename(path, moved);
        await appendFile(moved, completedRows("session", "second"));
        await vi.waitFor(() => expect(consume).toHaveBeenCalledTimes(6), {
            timeout: 3000,
        });
        expect(
            consume.mock.calls.map(([row]) => (row as { uuid: string }).uuid),
        ).toEqual([
            "first-u",
            "first-a",
            "first-d",
            "second-u",
            "second-a",
            "second-d",
        ]);
    } finally {
        await binding.cleanup("execution_stopped");
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    }
});

const terminalRows = (session: string, prompt: string, frame?: string) => {
    const body = frame?.slice(frame.indexOf("\n") + 1, frame.lastIndexOf("\n"));
    return [
        {
            type: "user",
            sessionId: session,
            uuid: `${prompt}-input`,
            promptId: prompt,
            origin: frame
                ? { kind: "peer", name: "Sender", body }
                : { kind: "human" },
            message: { role: "user", content: frame ?? "input" },
        },
        {
            type: "assistant",
            sessionId: session,
            uuid: `${prompt}-answer`,
            parentUuid: `${prompt}-input`,
            message: {
                role: "assistant",
                content: [{ type: "text", text: "done" }],
                stop_reason: "end_turn",
            },
        },
        {
            type: "system",
            subtype: "turn_duration",
            durationMs: 1,
            sessionId: session,
            uuid: `${prompt}-duration`,
            parentUuid: `${prompt}-answer`,
        },
    ]
        .map(
            (row) =>
                JSON.stringify({
                    isSidechain: false,
                    parentUuid: null,
                    ...row,
                }) + "\n",
        )
        .join("");
};

async function fixture() {
    const directory = await mkdtemp(join(tmpdir(), "aiox-native-binding-"));
    const registry = join(directory, "sessions", "1234.json");
    await mkdir(dirname(registry), { recursive: true });
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const path = (session: string) =>
        join(directory, "projects", "project", `${session}.jsonl`);
    await mkdir(dirname(path("session")), { recursive: true });
    const start = async (session = "session", source = "startup") => {
        await writeFile(
            registry,
            JSON.stringify({ sessionId: session, status: "idle" }),
        );
        return binding.observe({
            ...report,
            event: {
                hook_event_name: "SessionStart",
                session_id: session,
                transcript_path: path(session),
                source,
            },
        });
    };
    const track = (id = "delivery") =>
        binding.observations.track({
            deliveryId: id,
            from: { name: "Sender", role: null, description: null },
            createdAt: 1,
            content: id,
        });
    const close = async () => {
        await binding.cleanup("execution_stopped");
        probe.mockRestore();
        await rm(directory, { recursive: true, force: true });
    };
    return { directory, registry, control, binding, path, start, track, close };
}

test("requires the PID registry and returns no vendor watch registration", async () => {
    const f = await fixture();
    try {
        await expect(
            f.binding.observe({
                ...report,
                event: {
                    hook_event_name: "SessionStart",
                    session_id: "session",
                    transcript_path: f.path("session"),
                },
            }),
        ).rejects.toThrow();
        expect(f.control.setObservationError).toHaveBeenLastCalledWith(
            expect.stringMatching(/initialization/),
        );
        expect(await f.start()).toBeUndefined();
        expect(f.control.setObservationError).toHaveBeenLastCalledWith(null);
    } finally {
        await f.close();
    }
});

test.each(["relative.jsonl", "", undefined])(
    "rejects missing or nonabsolute initial transcript %s",
    async (path) => {
        const f = await fixture();
        try {
            await expect(
                f.binding.observe({
                    ...report,
                    event: {
                        hook_event_name: "SessionStart",
                        session_id: "session",
                        transcript_path: path,
                    },
                }),
            ).rejects.toBeInstanceOf(InvalidVendorReport);
        } finally {
            await f.close();
        }
    },
);

test("captures EOF before acknowledgment and resumes without historical replay", async () => {
    const f = await fixture();
    const consume = vi.spyOn(f.binding.observations, "observeTranscript");
    try {
        await writeFile(
            f.path("session"),
            terminalRows("session", "historical"),
        );
        await f.start();
        const frame = f.track();
        await appendFile(
            f.path("session"),
            terminalRows("session", "new", frame),
        );
        await vi.waitFor(() =>
            expect(f.control.settle).toHaveBeenCalledWith(
                "delivery",
                "completed",
            ),
        );
        await f.start("other");
        await f.start("session", "resume");
        await f.start("session", "compact");
        await f.binding.processExited(0, null);
        expect(consume).toHaveBeenCalledTimes(3);
        expect(f.control.settle).toHaveBeenCalledTimes(1);
    } finally {
        await f.close();
    }
});

test("same-session resume replaces observations while compact preserves them", async () => {
    const f = await fixture();
    const select = vi.spyOn(f.binding.observations, "selectSession");
    try {
        await f.start();
        const original = select.mock.results.at(-1)!.value;
        await f.start("session", "compact");
        expect(select.mock.results.at(-1)!.value).toBe(original);
        await f.start("session", "resume");
        expect(select.mock.results.at(-1)!.value).not.toBe(original);
    } finally {
        await f.close();
    }
});

test("new compact transcript starts at zero", async () => {
    const f = await fixture();
    const consume = vi.spyOn(f.binding.observations, "observeTranscript");
    try {
        await writeFile(f.path("session"), terminalRows("session", "compact"));
        await f.start("session", "compact");
        await f.binding.processExited(0, null);
        expect(consume).toHaveBeenCalledTimes(3);
    } finally {
        await f.close();
    }
});

test.each([
    [0, null, "interrupted", "Interrupted by user"],
    [2, null, "failed", "vendor_process_failed"],
    [0, 15, "interrupted", "Interrupted by user"],
] as const)(
    "final read precedes fallback for exit %s signal %s",
    async (code, signal, outcome, reason) => {
        const f = await fixture();
        try {
            await f.start();
            const frame = f.track("completed");
            f.track("remaining");
            await writeFile(
                f.path("session"),
                terminalRows("session", "p", frame),
            );
            await f.binding.processExited(code, signal);
            expect(f.control.settle.mock.calls).toEqual([
                ["completed", "completed"],
                outcome === "failed"
                    ? ["remaining", outcome, reason]
                    : ["remaining", outcome],
            ]);
        } finally {
            await f.close();
        }
    },
);

test("exit does not reopen a discarded session", async () => {
    const f = await fixture();
    const consume = vi.spyOn(f.binding.observations, "observeTranscript");
    try {
        await f.start("old");
        await f.start("current");
        await mkdir(f.path("old"));
        await writeFile(f.path("current"), terminalRows("current", "p"));
        await expect(f.binding.processExited(0, null)).resolves.toBeUndefined();
        expect(consume).toHaveBeenCalledTimes(3);
        await rm(f.path("old"), { recursive: true });
    } finally {
        await f.close();
    }
});

test("a rejected settlement retains its first outcome through cleanup", async () => {
    const f = await fixture();
    try {
        await f.start();
        const frame = f.track();
        f.control.settle.mockRejectedValue(new Error("not accepted"));
        await writeFile(f.path("session"), terminalRows("session", "p", frame));
        await expect(f.binding.processExited(0, null)).rejects.toThrow(
            /not accepted|storage failed/,
        );
        f.control.settle.mockResolvedValue(undefined);
        await f.binding.cleanup("external_connection_lost");
        expect(
            f.control.settle.mock.calls.every(
                (call) => call[1] === "completed",
            ),
        ).toBe(true);
        expect(f.control.settle).toHaveBeenLastCalledWith(
            "delivery",
            "completed",
        );
    } finally {
        await f.close();
    }
});

function completedRows(sessionId: string, promptId: string) {
    const common = { sessionId, isSidechain: false };
    return [
        {
            ...common,
            type: "user",
            uuid: `${promptId}-u`,
            parentUuid: null,
            promptId,
            origin: { kind: "human" },
            message: { role: "user", content: "input" },
        },
        {
            ...common,
            type: "assistant",
            uuid: `${promptId}-a`,
            parentUuid: `${promptId}-u`,
            message: {
                role: "assistant",
                stop_reason: "end_turn",
                content: [],
            },
        },
        {
            ...common,
            type: "system",
            subtype: "turn_duration",
            uuid: `${promptId}-d`,
            parentUuid: `${promptId}-a`,
            durationMs: 1,
        },
    ]
        .map((row) => JSON.stringify(row) + "\n")
        .join("");
}

test("SessionStart captures the new offset without waiting for old settlement", async () => {
    const f = await fixture();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    const consume = vi
        .spyOn(f.binding.observations, "observeTranscript")
        .mockImplementationOnce(() => held);
    try {
        await writeFile(f.path("old"), "");
        await f.start("old");
        await appendFile(f.path("old"), completedRows("old", "held"));
        await vi.waitFor(() => expect(consume).toHaveBeenCalledOnce());
        await writeFile(f.path("new"), completedRows("new", "historical"));
        const registered = vi.fn();
        const registration = f.start("new").then(registered);
        await vi.waitFor(() => expect(registered).toHaveBeenCalledOnce());
        await appendFile(f.path("new"), completedRows("new", "after-offset"));
        release();
        await registration;
        await f.binding.processExited(0, null);
        expect(consume).toHaveBeenCalledTimes(6);
    } finally {
        release();
        await f.close();
    }
});

test("finishes an active old read without sharing state with a rapid resume", async () => {
    const f = await fixture();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
        release = resolve;
    });
    const observe = f.binding.observations.observeTranscript.bind(
        f.binding.observations,
    );
    const consume = vi
        .spyOn(f.binding.observations, "observeTranscript")
        .mockImplementationOnce(async (...args) => {
            await held;
            await observe(...args);
        });
    try {
        await writeFile(f.path("old"), "");
        await f.start("old");
        const old = f.track("old-delivery");
        await appendFile(f.path("old"), terminalRows("old", "same", old));
        await vi.waitFor(() => expect(consume).toHaveBeenCalledOnce());
        await f.start("new");
        await f.start("old", "resume");
        const fresh = f.track("fresh-delivery");
        await appendFile(f.path("old"), terminalRows("old", "same", fresh));
        release();
        await vi.waitFor(() =>
            expect(f.control.settle).toHaveBeenCalledTimes(2),
        );
        expect(f.control.settle.mock.calls).toEqual([
            ["old-delivery", "completed"],
            ["fresh-delivery", "completed"],
        ]);
    } finally {
        release();
        await f.close();
    }
});

test("retries an outcome after its session has been discarded without reopening its file", async () => {
    const f = await fixture();
    try {
        await f.start("old");
        const frame = f.track();
        await f.binding.observations.observeTranscript(
            JSON.parse(terminalRows("old", "started", frame).split("\n")[0]!),
        );
        f.control.settle.mockRejectedValueOnce(new Error("storage"));
        await f.start("new");
        await mkdir(f.path("old"));
        await vi.waitFor(
            () => expect(f.control.settle).toHaveBeenCalledTimes(2),
            { timeout: 3000 },
        );
        expect(f.control.settle.mock.calls).toEqual([
            ["delivery", "interrupted"],
            ["delivery", "interrupted"],
        ]);
        expect(f.control.setObservationError).toHaveBeenLastCalledWith(null);
    } finally {
        await f.close();
    }
});

test("keeps only current transcript and registry watches across repeated transitions", async () => {
    const f = await fixture();
    const active = new Set<fs.FSWatcher>();
    const watchers: fs.FSWatcher[] = [];
    const { watch } = await vi.importActual<typeof fs>("node:fs");
    const spy = vi
        .spyOn(fs, "watch")
        .mockImplementation((...args: Parameters<typeof fs.watch>) => {
            const watcher = watch(...args);
            const close = watcher.close.bind(watcher);
            active.add(watcher);
            watchers.push(watcher);
            vi.spyOn(watcher, "close").mockImplementation(() => {
                active.delete(watcher);
                close();
            });
            return watcher;
        });
    try {
        for (let index = 0; index < 30; index++) {
            await writeFile(f.path(String(index)), "");
            await f.start(String(index));
            expect(active.size).toBe(2);
        }
        const retired = watchers.find((watcher) => !active.has(watcher))!;
        vi.mocked(retired.close).mockClear();
        retired.emit("change", "rename");
        expect(retired.close).not.toHaveBeenCalled();
        retired.emit("error", new Error("late retired watch error"));
        expect(f.control.setObservationError).toHaveBeenLastCalledWith(null);
        await f.binding.cleanup("execution_stopped");
        expect(active.size).toBe(0);
    } finally {
        await f.close();
        spy.mockRestore();
    }
});

test("retries a rejected outcome without another file change", async () => {
    const f = await fixture();
    try {
        await writeFile(f.path("session"), "");
        await f.start();
        const frame = f.track();
        f.control.settle.mockRejectedValueOnce(new Error("not accepted"));
        await appendFile(
            f.path("session"),
            terminalRows("session", "retry", frame),
        );
        await vi.waitFor(
            () => expect(f.control.settle).toHaveBeenCalledTimes(2),
            { timeout: 3000 },
        );
        expect(f.control.settle.mock.calls).toEqual([
            ["delivery", "completed"],
            ["delivery", "completed"],
        ]);
        expect(f.control.setObservationError).toHaveBeenLastCalledWith(null);
    } finally {
        await f.close();
    }
});

test.each(["startup", "clear", "resume"])(
    "registry may catch up after %s independently of old session disposal",
    async (source) => {
        const f = await fixture();
        try {
            f.binding.executionStarted();
            await writeFile(f.path("old"), "");
            await f.start("old");
            await vi.waitFor(() =>
                expect(f.control.setStatus).toHaveBeenLastCalledWith(
                    "idle",
                    undefined,
                ),
            );
            const frame = f.track();
            await expect(
                f.binding.observe({
                    ...report,
                    event: {
                        hook_event_name: "SessionStart",
                        session_id: "new",
                        source,
                        transcript_path: f.path("new"),
                    },
                }),
            ).resolves.toBeUndefined();
            expect(f.control.setStatus).toHaveBeenLastCalledWith(
                "aiox-preparing",
                "Waiting for session registry.",
            );
            await expect(
                f.binding.deliver({
                    deliveryId: "blocked",
                    from: { name: "Sender", role: null, description: null },
                    createdAt: 1,
                    content: "blocked",
                }),
            ).rejects.toThrow(
                "not_available: Agent is preparing/switching session. Please try again in a few moments.",
            );
            f.control.setStatus.mockClear();
            await appendFile(f.path("old"), terminalRows("old", "late", frame));
            expect(f.control.settle).not.toHaveBeenCalled();
            expect(f.control.setStatus).not.toHaveBeenCalled();
            await writeFile(
                f.registry,
                JSON.stringify({ sessionId: "new", status: "busy" }),
            );
            await vi.waitFor(() =>
                expect(f.control.setStatus).toHaveBeenLastCalledWith(
                    "working",
                    undefined,
                ),
            );
            await writeFile(
                f.path("new"),
                terminalRows("new", "actual", frame),
            );
            await expect(
                f.binding.deliver({
                    deliveryId: null,
                    from: { name: "Sender", role: null, description: null },
                    createdAt: 1,
                    content: "ready",
                }),
            ).resolves.toBeUndefined();
            await f.binding.processExited(0, null);
            expect(f.control.settle).toHaveBeenCalledExactlyOnceWith(
                "delivery",
                "completed",
            );
        } finally {
            await f.close();
        }
    },
);
