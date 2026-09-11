import { expect, test, vi } from "vitest";

import { ExecutionOwner, spawnNative } from "@/execution";
import type { ExecutionProcess } from "@/index";

const command = {
    file: process.execPath,
    args: [],
    cwd: process.cwd(),
    env: {},
};
test("owner retains failed cleanup for retry and refuses later process starts", async () => {
    const stop = vi
        .fn()
        .mockRejectedValueOnce(new Error("still alive"))
        .mockResolvedValue(undefined);
    const processHandle: ExecutionProcess = {
        exited: new Promise(() => {}),
        stop,
        write() {},
        resize() {},
    };
    const start = vi.fn(async () => processHandle);
    const owner = new ExecutionOwner(start);
    const dispose = vi.fn(async () => {});
    owner.own(dispose);
    await owner.foreground(command);
    await expect(owner.stop()).rejects.toThrow("still alive");
    expect(dispose).not.toHaveBeenCalled();
    await expect(owner.foreground(command)).rejects.toThrow("stopped");
    await owner.stop();
    expect(stop).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledOnce();
});

test("an owner supports helper readiness before foreground and cleans both on exit", async () => {
    const owner = new ExecutionOwner((input) => spawnNative(input, "pipe"));
    const helper = await owner.background({
        ...command,
        args: ["-e", "console.log('ready');setInterval(()=>{},1000)"],
    });
    try {
        const ready = await new Promise<string>((resolve) =>
            helper.stdout!.once("data", (chunk) => resolve(String(chunk))),
        );
        expect(ready).toContain("ready");
        const foreground = await owner.foreground({
            ...command,
            args: ["-e", "process.exit(7)"],
        });
        expect(await foreground.exited).toEqual({ exitCode: 7, signal: null });
    } finally {
        await owner.stop();
    }
    expect((await helper.exited).signal).not.toBeNull();
});

test("late resource allocation and shutdown share one disposal and retain a failure for retry", async () => {
    const owner = new ExecutionOwner(async () => {
        throw new Error("no process");
    });
    await owner.stop();
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
    const owned = expect(owner.own(dispose)).rejects.toThrow("busy");
    const stopped = expect(owner.stop()).rejects.toThrow("busy");
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledOnce();
    fail(new Error("busy"));
    await Promise.all([owned, stopped]);
    await owner.stop();
    expect(dispose).toHaveBeenCalledTimes(2);
});
