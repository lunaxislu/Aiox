import { appendFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { InvalidVendorReport } from "@aiox/vendor";
import { expect, test, vi } from "vitest";

import { ClaudeBinding } from "@/claude";
import * as inbox from "@/claude-inbox";

const controls = () => ({
    runtimeId: "runtime",
    setStatus: vi.fn(),
    settle: vi.fn(),
});
const report = {
    inboxPath: "/assigned",
    inboxToken: "secret",
    event: { hook_event_name: "SessionStart", session_id: "session" },
};

test("released bindings cannot become ready or accept hook reports", async () => {
    const binding = new ClaudeBinding(controls(), "/assigned");
    await binding.cleanup("execution_stopped");
    expect(() => binding.executionStarted()).toThrow(/stopped/);
    await expect(binding.observe(report)).rejects.toThrow(/stopped/);
});

test("readiness requires assigned inbox credential, connection and execution start", async () => {
    const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
    const control = controls();
    const binding = new ClaudeBinding(control, "/assigned");
    binding.requireMcp = true;
    const ready = vi.fn();
    binding.onReady = ready;
    try {
        await expect(
            binding.observe({ ...report, inboxPath: "/wrong" }),
        ).rejects.toThrow(/inbox/);
        await binding.observe(report);
        binding.mcpConnected();
        expect(ready).not.toHaveBeenCalled();
        expect(control.setStatus).not.toHaveBeenCalled();
        binding.executionStarted();
        expect(ready).toHaveBeenCalledOnce();
        await expect(
            binding.observe({ ...report, inboxToken: "changed" }),
        ).rejects.toThrow(/credential changed/);
        await binding.cleanup("external_connection_lost");
        expect(() => binding.executionStarted()).toThrow(/stopped/);
    } finally {
        probe.mockRestore();
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

test.each(["poll", "SessionEnd"])(
    "reads transcript via %s while Claude stays open and releases the reader",
    async (mode) => {
        const probe = vi.spyOn(inbox, "writeClaudeInbox").mockResolvedValue();
        const directory = await mkdtemp(join(tmpdir(), "aiox-binding-"));
        const path = join(directory, "session.jsonl");
        const control = controls();
        const binding = new ClaudeBinding(control, "/assigned");
        binding.executionStarted();
        const send = (name: string, extra = {}) =>
            binding.observe({
                ...report,
                event: {
                    hook_event_name: name,
                    session_id: "session",
                    prompt_id: "one",
                    transcript_path: path,
                    ...extra,
                },
            });
        try {
            await send("UserPromptSubmit", { prompt: "direct" });
            await send("PreToolUse", {
                tool_use_id: "tool",
                tool_name: "Bash",
            });
            await send("PermissionRequest", { tool_name: "Bash" });
            expect(control.setStatus.mock.lastCall?.[0]).toBe("awaiting-user");
            const common = {
                type: "user",
                isSidechain: false,
                sessionId: "session",
                promptId: "one",
            };
            const rows = [
                {
                    ...common,
                    uuid: "result",
                    toolDenialKind: "user-rejected",
                    message: {
                        role: "user",
                        content: [
                            {
                                type: "tool_result",
                                tool_use_id: "tool",
                                is_error: true,
                            },
                        ],
                    },
                },
                {
                    ...common,
                    uuid: "interrupt",
                    parentUuid: "result",
                    message: {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "[Request interrupted by user for tool use]",
                            },
                        ],
                    },
                },
            ];
            await writeFile(
                path,
                rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
            );
            if (mode === "SessionEnd") await send("SessionEnd");
            await vi.waitFor(() =>
                expect(control.setStatus.mock.lastCall?.[0]).toBe("idle"),
            );
            expect(binding.alive).toBe(true);
            await binding.cleanup("execution_stopped");
            control.setStatus.mockClear();
            await appendFile(path, JSON.stringify(rows[1]) + "\n");
            await new Promise((resolve) => setTimeout(resolve, 300));
            expect(control.setStatus).not.toHaveBeenCalled();
        } finally {
            await binding.cleanup("execution_stopped");
            probe.mockRestore();
            await rm(directory, { recursive: true, force: true });
        }
    },
);
