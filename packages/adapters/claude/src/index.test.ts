import { access } from "node:fs/promises";
import { dirname } from "node:path";

import { ExecutionOwner } from "@aiox/vendor";
import { expect, test, vi } from "vitest";

import * as environment from "@/claude-environment";
import * as version from "@/claude-version";
import { claudeAdapter } from "@/index";

test("execution owner retains resources after collaboration cleanup and receives the validated vendor launch", async () => {
    const foreground = vi.fn().mockResolvedValue({ stop: vi.fn() });
    const owner = new ExecutionOwner(foreground);
    const probe = vi.spyOn(version, "probeClaude").mockResolvedValue("2.1.268");
    const execution = await claudeAdapter.createExecution(owner);
    try {
        const binding = claudeAdapter.createBinding(
            { runtimeId: "r", setStatus: vi.fn(), settle: vi.fn() },
            execution.connection,
        );
        await binding.cleanup("external_connection_lost");
        const { inboxPath } = execution.connection as { inboxPath: string };
        if (process.platform !== "win32")
            await expect(access(dirname(inboxPath))).resolves.toBeUndefined();
        const command = {
            file: "claude",
            args: ["--resume"],
            cwd: process.cwd(),
            env: {},
        };
        await execution.start(command, owner);
        expect(probe).toHaveBeenCalledWith("claude", {}, process.cwd());
        expect(foreground).toHaveBeenCalledWith(command);
        await expect(
            execution.start({ ...command, file: "other" }, owner),
        ).rejects.toThrow();
    } finally {
        await owner.stop();
        probe.mockRestore();
    }
});

test("cancellation while allocating the inbox disposes it and rejects execution creation", async () => {
    const dispose = vi.fn(async () => {});
    let allocated!: (value: { path: string; dispose(): Promise<void> }) => void;
    const allocation = vi
        .spyOn(environment, "createClaudeInbox")
        .mockImplementation(
            () =>
                new Promise((resolve) => {
                    allocated = resolve;
                }),
        );
    const foreground = vi.fn();
    const owner = new ExecutionOwner(foreground);
    try {
        const creating = claudeAdapter.createExecution(owner);
        await owner.stop();
        allocated({ path: "/assigned", dispose });
        await expect(creating).rejects.toThrow();
        expect(dispose).toHaveBeenCalledOnce();
        expect(foreground).not.toHaveBeenCalled();
    } finally {
        allocation.mockRestore();
        await owner.stop();
    }
});

test("stopped execution skips version probing and cannot spawn", async () => {
    const foreground = vi.fn();
    const owner = new ExecutionOwner(foreground);
    const execution = await claudeAdapter.createExecution(owner);
    const probe = vi.spyOn(version, "probeClaude").mockResolvedValue("2.1.268");
    try {
        await owner.stop();
        await expect(
            execution.start(
                {
                    file: "claude",
                    args: [],
                    cwd: process.cwd(),
                    env: {},
                },
                owner,
            ),
        ).rejects.toThrow();
        expect(probe).not.toHaveBeenCalled();
        expect(foreground).not.toHaveBeenCalled();
    } finally {
        probe.mockRestore();
        await owner.stop();
    }
});
