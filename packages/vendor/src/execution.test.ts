import { constants } from "node:os";

import { Effect } from "effect";
import fc from "fast-check";
import { expect, test, vi } from "vitest";

import { ExecutionOwner, spawnNative } from "@/execution";
import type { ExecutionProcess } from "@/index";

const command = {
    file: process.execPath,
    args: [],
    cwd: process.cwd(),
    env: {},
};
const run = Effect.runPromise;

test("execution lifecycle operations are native Effects", () => {
    const processHandle: ExecutionProcess = {
        exited: Effect.never,
        stop: () => Effect.void,
        write() {},
        resize() {},
    };
    const owner = new ExecutionOwner(() => Effect.succeed(processHandle));

    expect(Effect.isEffect(owner.own(() => Effect.void))).toBe(true);
    expect(Effect.isEffect(owner.foreground(command))).toBe(true);
    expect(Effect.isEffect(owner.background(command))).toBe(true);
    expect(Effect.isEffect(owner.stop())).toBe(true);
    expect(Effect.isEffect(spawnNative(command, "pipe"))).toBe(true);
    expect(Effect.isEffect(processHandle.exited)).toBe(true);
    expect(Effect.isEffect(processHandle.stop())).toBe(true);
});

test("owner retains failed process cleanup for retry and refuses later starts", async () => {
    const stop = vi
        .fn()
        .mockReturnValueOnce(Effect.fail(new Error("still alive")))
        .mockReturnValue(Effect.void);
    const processHandle: ExecutionProcess = {
        exited: Effect.never,
        stop,
        write() {},
        resize() {},
    };
    const owner = new ExecutionOwner(() => Effect.succeed(processHandle));
    const dispose = vi.fn(() => Effect.void);

    await run(owner.own(dispose));
    await run(owner.foreground(command));
    await expect(run(owner.stop())).rejects.toThrow("still alive");
    expect(dispose).not.toHaveBeenCalled();
    await expect(run(owner.foreground(command))).rejects.toThrow("stopped");
    await run(owner.stop());
    expect(stop).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledOnce();
});

test("owner joins simultaneous stops into one process cleanup attempt", async () => {
    let finishStop!: () => void;
    const stop = vi.fn();
    const handle: ExecutionProcess = {
        exited: Effect.never,
        stop: () =>
            Effect.callback<void, unknown>((resume) => {
                stop();
                finishStop = () => resume(Effect.void);
            }),
        write() {},
        resize() {},
    };
    const owner = new ExecutionOwner(() => Effect.succeed(handle));

    await run(owner.foreground(command));
    const first = run(owner.stop());
    const second = run(owner.stop());
    await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce());
    finishStop();
    await Promise.all([first, second]);
    expect(stop).toHaveBeenCalledOnce();
});

test("an owner starts helpers before foreground and stops both on exit", async () => {
    let owner!: ExecutionOwner;
    owner = new ExecutionOwner((input) => owner.background(input));
    const helper = await run(
        owner.background({
            file: process.execPath,
            args: ["-e", "console.log('ready');setInterval(()=>{},1000)"],
            cwd: process.cwd(),
            env: {},
        }),
    );
    await new Promise<void>((resolve) => helper.stdout!.once("data", resolve));
    const foreground = await run(
        owner.foreground({
            file: process.execPath,
            args: ["-e", "process.exit(7)"],
            cwd: process.cwd(),
            env: {},
        }),
    );
    expect(await run(foreground.exited)).toEqual({
        exitCode: 7,
        signal: null,
    });
    await run(owner.stop());
    expect((await run(helper.exited)).signal).not.toBeNull();
});

test("native stop confirms graceful exit before releasing its scope", async () => {
    const processHandle = await run(
        spawnNative(
            {
                ...command,
                args: [
                    "-e",
                    "process.on('SIGTERM',()=>setTimeout(()=>process.exit(3),10));console.log('ready');setInterval(()=>{},1000)",
                ],
            },
            "pipe",
        ),
    );
    await new Promise<void>((resolve) =>
        processHandle.stdout!.once("data", () => resolve()),
    );
    const exited = run(processHandle.exited);

    await run(processHandle.stop());
    expect(await exited).toEqual({ exitCode: 3, signal: null });
});

test("native stop escalates and confirms SIGKILL when TERM is ignored", async () => {
    const processHandle = await run(
        spawnNative(
            {
                ...command,
                args: [
                    "-e",
                    "process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)",
                ],
            },
            "pipe",
        ),
    );
    await new Promise<void>((resolve) =>
        processHandle.stdout!.once("data", () => resolve()),
    );
    const exited = run(processHandle.exited);

    await run(processHandle.stop());
    expect(await exited).toEqual({
        exitCode: 0,
        signal: constants.signals.SIGKILL,
    });
});

test("late resource allocation and shutdown share disposal and retain a failure for retry", async () => {
    const owner = new ExecutionOwner(() =>
        Effect.fail(new Error("no process")),
    );
    await run(owner.stop());
    let fail!: (error: Error) => void;
    const dispose = vi
        .fn()
        .mockImplementationOnce(
            () =>
                new Promise<void>((_resolve, reject) => {
                    fail = reject;
                }),
        )
        .mockResolvedValue(undefined);
    const disposeEffect = () =>
        Effect.tryPromise({ try: dispose, catch: (error) => error });
    const owned = run(owner.own(disposeEffect));
    const stopping = run(owner.stop());

    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    fail(new Error("busy"));
    await expect(owned).rejects.toThrow("busy");
    await expect(stopping).rejects.toThrow("busy");
    await run(owner.stop());
    expect(dispose).toHaveBeenCalledTimes(2);
});

test("owner sequences never start after stop or dispose a live resource", async () => {
    await fc.assert(
        fc.asyncProperty(
            fc.array(fc.constantFrom("start", "own", "stop"), {
                maxLength: 30,
            }),
            async (actions) => {
                let alive = false;
                let closed = false;
                let assigned = false;
                let resources = 0;
                const owner = new ExecutionOwner(() =>
                    Effect.sync(() => {
                        expect(closed).toBe(false);
                        alive = true;
                        return {
                            exited: Effect.never,
                            stop: () =>
                                Effect.sync(() => {
                                    alive = false;
                                }),
                            write() {},
                            resize() {},
                        };
                    }),
                );
                for (const action of actions) {
                    if (action === "start") {
                        if (closed || assigned)
                            await expect(
                                run(owner.foreground(command)),
                            ).rejects.toThrow();
                        else {
                            await run(owner.foreground(command));
                            assigned = true;
                        }
                    } else if (action === "own") {
                        resources++;
                        const result = run(
                            owner.own(() =>
                                Effect.sync(() => {
                                    expect(alive).toBe(false);
                                    resources--;
                                }),
                            ),
                        );
                        if (closed)
                            await expect(result).rejects.toThrow("stopped");
                        else await result;
                    } else {
                        closed = true;
                        await run(owner.stop());
                        expect(owner.hasProcessHandles).toBe(false);
                        expect(resources).toBe(0);
                    }
                }
                closed = true;
                await run(owner.stop());
                expect(alive).toBe(false);
                expect(resources).toBe(0);
            },
        ),
        { numRuns: 100 },
    );
});

test("shutdown waits for late spawn and retains its handle until termination is confirmed", async () => {
    let spawned!: (handle: ExecutionProcess) => void;
    const owner = new ExecutionOwner(() =>
        Effect.callback<ExecutionProcess, unknown>((resume) => {
            spawned = (handle) => resume(Effect.succeed(handle));
        }),
    );
    const start = run(owner.foreground(command));
    await vi.waitFor(() => expect(spawned).toBeTypeOf("function"));
    const dispose = vi.fn(() => Effect.void);
    await run(owner.own(dispose));
    const stopping = run(owner.stop());
    expect(owner.signal.aborted).toBe(true);
    expect(owner.hasProcessHandles).toBe(true);
    const stop = vi
        .fn()
        .mockReturnValueOnce(Effect.fail(new Error("termination unconfirmed")))
        .mockReturnValue(Effect.void);
    spawned({
        exited: Effect.never,
        stop,
        write() {},
        resize() {},
    });
    await start;
    await expect(stopping).rejects.toThrow("termination unconfirmed");
    expect(owner.hasProcessHandles).toBe(true);
    expect(dispose).not.toHaveBeenCalled();
    await run(owner.stop());
    expect(owner.hasProcessHandles).toBe(false);
    expect(dispose).toHaveBeenCalledOnce();
});
