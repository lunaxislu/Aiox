import { spawn, type ChildProcess } from "node:child_process";
import { constants } from "node:os";

import {
    createClaudeInbox,
    probeClaude,
} from "@aiox/daemon/claude-environment";
import {
    externalAgentServerFrameSchema,
    type ExternalAgentRun,
} from "@aiox/protocol";
import type { RawData, WebSocket } from "ws";

type Exit = { exitCode: number; signal: number | null };

/** The CLI owns the process and inbox; losing collaboration cannot kill either. */
export async function runExternal(
    socket: WebSocket,
    input: Omit<ExternalAgentRun, "inboxPath">,
): Promise<Exit> {
    const inbox = await createClaudeInbox();
    try {
        return await new Promise<Exit>((resolve, reject) => {
            let child: ChildProcess | undefined;
            let preparing = false;
            let ready = false;
            let connected = true;
            let finished = false;
            let failure: Error | undefined;
            let exited: Exit | undefined;
            let timer: ReturnType<typeof setTimeout> | undefined;
            let killTimer: ReturnType<typeof setTimeout> | undefined;
            const diagnostic = (message: string) =>
                process.stderr.write(`AIOX: ${message}\n`);
            const finish = (error?: Error) => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                clearTimeout(killTimer);
                socket.off("message", receive);
                socket.off("close", disconnected);
                // Keep the error guard until the caller terminates the socket.
                process.off("SIGINT", interrupted);
                process.off("SIGTERM", terminated);
                if (error ?? failure) reject(error ?? failure);
                else resolve(exited!);
            };
            const send = (frame: unknown) => {
                if (!connected || socket.readyState !== socket.OPEN)
                    return false;
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
                if (!child)
                    finish(
                        new Error(
                            "AIOX connection closed before vendor launch.",
                        ),
                    );
                else if (exited) finish();
                else
                    diagnostic(
                        "Collaboration connection lost. The vendor is still running; rerun agent run to reconnect after exiting.",
                    );
            };
            // A terminal SIGINT already reaches the foreground vendor. Do not send it twice.
            const interrupted = () => {};
            const terminated = () => {
                child?.kill("SIGTERM");
            };
            const startupFailed = (message: string) => {
                if (failure) return;
                failure ??= new Error(message);
                if (!child || exited) {
                    finish(failure);
                    return;
                }
                diagnostic(message);
                child.kill("SIGTERM");
                killTimer ??= setTimeout(() => child?.kill("SIGKILL"), 2000);
                killTimer.unref();
            };
            const receive = (raw: RawData, binary: boolean) => {
                if (finished || !connected) return;
                let data: unknown;
                try {
                    if (!binary) data = JSON.parse(raw.toString());
                } catch {}
                const parsed = externalAgentServerFrameSchema.safeParse(data);
                if (!parsed.success) {
                    // Invalid transport data is connection loss, never a process termination command.
                    if (child)
                        diagnostic("Invalid collaboration control frame.");
                    disconnected();
                    socket.terminate();
                    return;
                }
                const frame = parsed.data;
                switch (frame.type) {
                    case "prepared": {
                        if (preparing || child) {
                            disconnected();
                            socket.terminate();
                            return;
                        }
                        preparing = true;
                        void (async () => {
                            await probeClaude("claude", frame.env, input.cwd);
                            if (finished || !connected) return;
                            clearTimeout(timer);
                            child = spawn("claude", frame.args, {
                                cwd: input.cwd,
                                env: frame.env,
                                stdio: "inherit",
                            });
                            process.on("SIGINT", interrupted);
                            process.on("SIGTERM", terminated);
                            child.once("spawn", () =>
                                send({ type: "started" }),
                            );
                            child.once("error", () =>
                                finish(
                                    new Error(
                                        "Cannot start Claude: the vendor process could not be created.",
                                    ),
                                ),
                            );
                            child.once("exit", (code, signal) => {
                                exited = {
                                    exitCode: code ?? 0,
                                    signal:
                                        signal === null
                                            ? null
                                            : constants.signals[signal],
                                };
                                clearTimeout(killTimer);
                                process.off("SIGINT", interrupted);
                                process.off("SIGTERM", terminated);
                                if (!ready && connected)
                                    failure ??= new Error(
                                        "Claude exited before its AIOX connections became ready.",
                                    );
                                if (!send({ type: "exit", ...exited })) {
                                    finish();
                                    return;
                                }
                                // Cleanup acknowledgements cannot prevent return to the user's shell.
                                timer = setTimeout(() => {
                                    diagnostic(
                                        "Registration cleanup was not acknowledged; vendor exit is confirmed.",
                                    );
                                    finish();
                                }, 1500);
                            });
                        })().catch((error: unknown) =>
                            finish(
                                error instanceof Error
                                    ? error
                                    : new Error(
                                          "Claude launch preparation failed.",
                                      ),
                            ),
                        );
                        break;
                    }
                    case "ready":
                        if (child && !exited) ready = true;
                        break;
                    case "startup-failed":
                        if (ready) {
                            disconnected();
                            socket.terminate();
                            break;
                        }
                        startupFailed(frame.message);
                        break;
                    case "error":
                        if (!child) finish(new Error(frame.message));
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
            if (!send({ ...input, inboxPath: inbox.path })) disconnected();
        });
    } finally {
        await inbox.dispose();
    }
}
