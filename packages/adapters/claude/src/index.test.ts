import { access } from "node:fs/promises";
import { dirname } from "node:path";

import { ExecutionOwner } from "@aiox/vendor";
import type { ExecutionProcess } from "@aiox/vendor";
import { Effect } from "effect";
import { expect, test, vi } from "vitest";

import * as environment from "@/claude-environment";
import * as version from "@/claude-version";
import { claudeAdapter } from "@/index";

const run = Effect.runPromise;
const processHandle: ExecutionProcess = {
    exited: Effect.never,
    stop: () => Effect.void,
    write() {},
    resize() {},
};

test("execution owner retains resources and validates vendor launch", async () => {
    const foreground = vi.fn(() => Effect.succeed(processHandle));
    const owner = new ExecutionOwner(foreground);
    const probe = vi.spyOn(version, "probeClaude").mockResolvedValue("2.1.268");
    const execution = await run(claudeAdapter.createExecution(owner));
    try {
        const binding = claudeAdapter.createBinding(
            {
                runtimeId: "r",
                setStatus: vi.fn(),
                setObservationError: vi.fn(),
                settle: vi.fn(),
            },
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
        await run(execution.start(command, owner));
        expect(probe).toHaveBeenCalledWith(
            "claude",
            {},
            process.cwd(),
            owner.signal,
        );
        expect(foreground).toHaveBeenCalledWith(command);
        await expect(
            run(execution.start({ ...command, file: "other" }, owner)),
        ).rejects.toThrow();
    } finally {
        await run(owner.stop());
        probe.mockRestore();
    }
});

test("late inbox allocation after shutdown is disposed before creation fails", async () => {
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
    const foreground = vi.fn(() => Effect.succeed(processHandle));
    const owner = new ExecutionOwner(foreground);
    try {
        const creating = run(claudeAdapter.createExecution(owner));
        await vi.waitFor(() => expect(allocated).toBeTypeOf("function"));
        await run(owner.stop());
        allocated({ path: "/assigned", dispose });
        await expect(creating).rejects.toThrow();
        expect(dispose).toHaveBeenCalledOnce();
        expect(foreground).not.toHaveBeenCalled();
    } finally {
        allocation.mockRestore();
        await run(owner.stop());
    }
});

test("stop before adapter startup prevents version probe and spawn", async () => {
    const foreground = vi.fn(() => Effect.succeed(processHandle));
    const owner = new ExecutionOwner(foreground);
    const execution = await run(claudeAdapter.createExecution(owner));
    const probe = vi.spyOn(version, "probeClaude");
    try {
        await run(owner.stop());
        await expect(
            run(
                execution.start(
                    {
                        file: "claude",
                        args: [],
                        cwd: process.cwd(),
                        env: {},
                    },
                    owner,
                ),
            ),
        ).rejects.toThrow();
        expect(probe).not.toHaveBeenCalled();
        expect(foreground).not.toHaveBeenCalled();
    } finally {
        await run(owner.stop());
        probe.mockRestore();
    }
});
