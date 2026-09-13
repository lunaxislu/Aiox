import {
    externalAgentServerFrameSchema,
    type ExternalAgentRun,
} from "@aiox/protocol";
import {
    ExecutionOwner,
    spawnNative,
    type ExecutionExit,
    type ExecutionProcess,
    type VendorAdapter,
} from "@aiox/vendor";
import type { RawData, WebSocket } from "ws";

/** Only the launcher owns execution resources. Collaboration loss never stops them. */
export async function runExternal(
    socket: WebSocket,
    input: Omit<ExternalAgentRun, "connection">,
    adapter: VendorAdapter,
): Promise<ExecutionExit> {
    const owner = new ExecutionOwner((command) =>
        spawnNative(command, "inherit"),
    );
    let starting: Promise<void> | undefined;
    let finishTermination: ((error?: unknown) => void) | undefined;
    const terminated = () => {
        void owner.stop().then(
            () => finishTermination?.(),
            (error: unknown) => finishTermination?.(error),
        );
    };
    process.on("SIGTERM", terminated);
    try {
        const execution = await adapter.createExecution({
            own: (dispose) => owner.own(dispose),
            signal: owner.signal,
        });
        owner.signal.throwIfAborted();
        return await new Promise<ExecutionExit>((resolve, reject) => {
            let foreground: ExecutionProcess | undefined;
            let preparing = false;
            let ready = false;
            let connected = true;
            let finished = false;
            let failure: Error | undefined;
            let exited: ExecutionExit | undefined;
            let timer: ReturnType<typeof setTimeout> | undefined;
            const diagnostic = (message: string) =>
                process.stderr.write(`AIOX: ${message}\n`);
            const finish = (error?: Error) => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                socket.off("message", receive);
                socket.off("close", disconnected);
                process.off("SIGINT", interrupted);
                if (error ?? failure) reject(error ?? failure);
                else resolve(exited!);
            };
            const send = (frame: unknown) => {
                if (!connected) return false;
                if (socket.readyState !== socket.OPEN) {
                    disconnected();
                    return false;
                }
                try {
                    socket.send(JSON.stringify(frame));
                    return true;
                } catch {
                    disconnected();
                    return false;
                }
            };
            const disconnected = () => {
                if (!connected || finished) return;
                connected = false;
                clearTimeout(timer);
                if (exited) finish();
                else if (!preparing || !owner.hasProcessHandles)
                    finish(
                        new Error(
                            "AIOX connection closed before vendor launch.",
                        ),
                    );
                else
                    diagnostic(
                        "Collaboration connection lost. The vendor is still running.",
                    );
            };
            // Native foreground terminal delivery already sends SIGINT to the vendor.
            const interrupted = () => {};
            finishTermination = (error) => {
                if (error || !foreground)
                    finish(
                        error instanceof Error
                            ? error
                            : new Error(
                                  error === undefined
                                      ? "Vendor execution was terminated."
                                      : String(error),
                              ),
                    );
            };
            const receive = (raw: RawData, binary: boolean) => {
                if (finished || !connected) return;
                let data: unknown;
                try {
                    if (!binary) data = JSON.parse(raw.toString());
                } catch {}
                const parsed = externalAgentServerFrameSchema.safeParse(data);
                if (!parsed.success) {
                    if (owner.hasProcessHandles)
                        diagnostic("Invalid collaboration control frame.");
                    disconnected();
                    socket.terminate();
                    return;
                }
                const frame = parsed.data;
                switch (frame.type) {
                    case "prepared": {
                        if (preparing) {
                            disconnected();
                            socket.terminate();
                            return;
                        }
                        preparing = true;
                        clearTimeout(timer);
                        process.on("SIGINT", interrupted);
                        starting = (async () => {
                            foreground = await execution.start(
                                frame.launch,
                                owner,
                            );
                            send({ type: "started" });
                            exited = await foreground.exited;
                            // Natural exit also confirms the whole owner, not just its foreground.
                            await owner.stop();
                            if (finished) return;
                            if (
                                !ready &&
                                connected &&
                                socket.readyState === socket.OPEN
                            )
                                failure ??= new Error(
                                    "Vendor exited before its AIOX connections became ready.",
                                );
                            if (!send({ type: "exit", ...exited })) {
                                finish();
                                return;
                            }
                            timer = setTimeout(() => {
                                diagnostic(
                                    "Registration cleanup was not acknowledged; vendor exit is confirmed.",
                                );
                                finish();
                            }, 1500);
                        })().catch((error: unknown) => {
                            finish(
                                failure ??
                                    (error instanceof Error
                                        ? error
                                        : new Error(
                                              "Vendor launch preparation failed.",
                                          )),
                            );
                        });
                        break;
                    }
                    case "ready":
                        if (foreground && !exited) ready = true;
                        break;
                    case "startup-failed":
                        diagnostic(frame.message);
                        if (!owner.hasProcessHandles)
                            finish(new Error(frame.message));
                        disconnected();
                        socket.terminate();
                        break;
                    case "error":
                        if (!preparing || !owner.hasProcessHandles)
                            finish(new Error(frame.message));
                        else {
                            diagnostic(frame.message);
                            if (exited) finish();
                        }
                        break;
                    case "exit":
                        if (exited) finish();
                        break;
                }
            };
            socket.on("message", receive);
            socket.on("close", disconnected);
            socket.on("error", disconnected);
            timer = setTimeout(
                () => finish(new Error("AIOX launch preparation timed out.")),
                15000,
            );
            if (!send({ ...input, connection: execution.connection }))
                disconnected();
        });
    } finally {
        process.off("SIGTERM", terminated);
        await owner.stop();
        await starting;
        // Startup may acquire resources while the first stop is in progress.
        await owner.stop();
    }
}
