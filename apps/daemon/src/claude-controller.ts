import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

import {
    agentRunSchema,
    externalAgentRunSchema,
    externalAgentClientFrameSchema,
} from "@aiox/protocol";
import type { TerminalExit, TerminalListener } from "@aiox/terminal";
import type { WebSocket } from "ws";
import { z } from "zod";

import { ClaudeBinding } from "@/claude";
import { claudeHookCommand } from "@/claude-hook";
import { prepareClaudeLaunch } from "@/claude-launch";
import { probeClaude } from "@/claude-version";
import type { Daemon } from "@/daemon";
import { readJson } from "@/http";
import { bearerToken } from "@/mcp";
import { collaborationInstruction } from "@/messaging";

const reportSchema = z.strictObject({
    event: z.looseObject({
        hook_event_name: z.string().min(1),
        session_id: z.string().min(1),
    }),
    inboxPath: z.string().optional(),
    inboxToken: z.string().optional(),
});
const resizeSchema = z.strictObject({
    type: z.literal("resize"),
    cols: z.int().positive(),
    rows: z.int().positive(),
});

/** Web carries terminal bytes; external CLI carries lifecycle control only. */
export class ClaudeController {
    readonly #hooks = new Map<string, ClaudeBinding>();
    constructor(private readonly daemon: Daemon) {}

    async hook(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        const binding = this.#hooks.get(bearerToken(request) ?? "");
        if (
            !binding ||
            !this.daemon.services.runtimes.get(binding.controls.runtimeId)
                ?.collaborationActive
        ) {
            response.writeHead(401).end("Invalid Claude hook credential.");
            return;
        }
        if (request.method !== "POST") {
            response.writeHead(405).end();
            return;
        }
        try {
            const parsed = reportSchema.safeParse(await readJson(request));
            if (
                !this.daemon.services.runtimes.get(binding.controls.runtimeId)
                    ?.collaborationActive
            ) {
                response.writeHead(401).end("Invalid Claude hook credential.");
                return;
            }
            if (!parsed.success) {
                response.writeHead(400).end("Invalid Claude hook report.");
                return;
            }
            await binding.observe(parsed.data);
            response.writeHead(204).end();
        } catch {
            response
                .writeHead(409)
                .end("Claude hook could not be applied to this runtime.");
        }
    }

    attachExternal(socket: WebSocket): void {
        let binding: ClaudeBinding | undefined;
        let runtimeId: string | undefined;
        let ended = false;
        let prepared = false;
        let started = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const send = (frame: object) => {
            if (socket.readyState === socket.OPEN)
                socket.send(JSON.stringify(frame));
        };
        const release = async () => {
            if (binding) this.#hooks.delete(binding.hookToken);
            if (runtimeId) await this.daemon.stopRuntime(runtimeId, true);
        };
        const finish = async (message?: string, exit?: TerminalExit) => {
            if (ended) return;
            ended = true;
            clearTimeout(timer);
            const startupFailed = Boolean(
                message && prepared && !binding?.wasReady,
            );
            if (startupFailed) send({ type: "startup-failed", message });
            try {
                await release();
            } catch {
                message = "Claude collaboration cleanup remains unconfirmed.";
                console.error(message);
                send({ type: "error", message });
                socket.close();
                return;
            }
            if (message && !startupFailed) send({ type: "error", message });
            else if (!message && exit) send({ type: "exit", ...exit });
            socket.close();
        };
        const lost = () => {
            if (ended) return;
            ended = true;
            clearTimeout(timer);
            void release().catch(() => {
                console.error(
                    "Claude collaboration cleanup remains unconfirmed after connection loss.",
                );
            });
        };
        socket.on("close", lost);
        socket.on("error", lost);
        timer = setTimeout(
            () => void finish("No Claude launch request was received."),
            5000,
        );
        socket.once("message", (raw, binary) => {
            clearTimeout(timer);
            socket.pause();
            void (async () => {
                let payload: unknown;
                try {
                    payload = binary ? undefined : JSON.parse(raw.toString());
                } catch {}
                const parsed = externalAgentRunSchema.safeParse(payload);
                if (!parsed.success)
                    throw new Error(
                        "Cannot start Claude: invalid external launch request.",
                    );
                const input = parsed.data;
                const networkId =
                    input.network === undefined
                        ? null
                        : (
                              await this.daemon.services.networks.require(
                                  input.network,
                              )
                          ).id;
                if (ended) return;
                const registration = await this.daemon.registerRuntime({
                    networkId,
                    executionOwnership: "external",
                    ...(input.name === undefined ? {} : { name: input.name }),
                    ...(input.role === undefined ? {} : { role: input.role }),
                    ...(input.description === undefined
                        ? {}
                        : { description: input.description }),
                    createBinding: (controls) => {
                        binding = new ClaudeBinding(controls, input.inboxPath);
                        return binding;
                    },
                });
                runtimeId = registration.runtimeId;
                if (ended) {
                    await release();
                    return;
                }
                const current = binding!;
                current.requireMcp = networkId !== null;
                current.onReleased = () => {
                    this.#hooks.delete(current.hookToken);
                    if (ended) return;
                    ended = true;
                    clearTimeout(timer);
                    socket.close();
                };
                this.#hooks.set(current.hookToken, current);
                const launch = await prepareClaudeLaunch({
                    args: input.args,
                    cwd: input.cwd,
                    env: input.env,
                    inboxPath: current.inboxPath,
                    mcpUrl: networkId === null ? null : registration.mcpUrl,
                    instruction: [collaborationInstruction, input.instruction]
                        .filter(Boolean)
                        .join("\n\n"),
                    hooks: launchHooks(),
                });
                if (
                    ended ||
                    !this.daemon.services.runtimes.get(runtimeId)
                        ?.collaborationActive
                )
                    return;
                current.observationOptions.hasBlockingStopHooks =
                    launch.hasBlockingStopHooks;
                current.onReady = () => {
                    clearTimeout(timer);
                    if (
                        !ended &&
                        this.daemon.services.runtimes.get(
                            current.controls.runtimeId,
                        )?.collaborationActive
                    )
                        send({ type: "ready" });
                };
                socket.on("message", (data, isBinary) => {
                    if (ended) return;
                    let payload: unknown;
                    try {
                        payload = isBinary
                            ? undefined
                            : JSON.parse(data.toString());
                    } catch {}
                    const frame =
                        externalAgentClientFrameSchema.safeParse(payload);
                    if (
                        !frame.success ||
                        (frame.data.type === "started" && started)
                    ) {
                        void finish("Invalid external Claude lifecycle frame.");
                        return;
                    }
                    if (frame.data.type === "started") {
                        started = true;
                        current.externalStarted();
                    } else {
                        const exit = frame.data;
                        this.daemon.services.runtimes.revoke(
                            current.controls.runtimeId,
                        );
                        void (async () => {
                            try {
                                await current.processExited(
                                    exit.exitCode,
                                    exit.signal,
                                );
                            } finally {
                                await finish(
                                    current.wasReady
                                        ? undefined
                                        : "Claude exited before its inbox and hooks became ready.",
                                    exit,
                                );
                            }
                        })().catch(() => {});
                    }
                });
                prepared = true;
                send({
                    type: "prepared",
                    runtimeId,
                    args: launch.args,
                    env: {
                        ...Object.fromEntries(
                            Object.entries(launch.env).filter(
                                ([key]) =>
                                    !key.toUpperCase().startsWith("AIOX_"),
                            ),
                        ),
                        AIOX_MCP_TOKEN: registration.token,
                        AIOX_HOOK_TOKEN: current.hookToken,
                        AIOX_HOOK_URL: `http://127.0.0.1:${this.daemon.ports.daemon}/api/claude/hooks`,
                    },
                });
                socket.resume();
                timer = setTimeout(() => {
                    if (
                        !this.daemon.services.runtimes.get(
                            current.controls.runtimeId,
                        )?.collaborationActive
                    ) {
                        current.onReleased?.();
                        return;
                    }
                    if (!current.wasReady)
                        void finish(
                            "Claude inbox and hooks did not become ready within 60 seconds. Check Claude startup and hook settings, then try again.",
                        );
                }, 60_000);
                timer.unref();
            })().catch((error: unknown) =>
                finish(
                    error instanceof Error
                        ? error.message
                        : "Cannot start Claude.",
                ),
            );
        });
    }

    attach(socket: WebSocket): void {
        let binding: ClaudeBinding | undefined;
        let runtimeId: string | undefined;
        let ended = false;
        let finishing: Promise<void> | undefined;
        let readyTimer: ReturnType<typeof setTimeout> | undefined;
        let detach: (() => void) | undefined;
        const finish = (error?: string, exit?: TerminalExit): Promise<void> => {
            finishing ??= (async () => {
                ended = true;
                clearTimeout(readyTimer);
                detach?.();
                if (runtimeId) {
                    try {
                        await this.daemon.stopRuntime(runtimeId, true);
                        if (binding) this.#hooks.delete(binding.hookToken);
                    } catch {
                        error =
                            "Claude cleanup remains unconfirmed. Run 'aiox daemon stop --force' to retry cleanup.";
                    }
                }
                if (socket.readyState === socket.OPEN) {
                    socket.resume();
                    socket.send(
                        JSON.stringify(
                            error
                                ? { type: "error", message: error }
                                : {
                                      type: "exit",
                                      ...(exit ?? {
                                          exitCode: 0,
                                          signal: null,
                                      }),
                                  },
                        ),
                    );
                    socket.close();
                }
            })();
            return finishing;
        };
        const disconnected = () => {
            if (ended) return;
            ended = true;
            void (async () => {
                try {
                    await binding?.connectionLost();
                } finally {
                    await finish("Claude foreground connection was lost.");
                }
            })().catch(() => {});
        };
        socket.on("error", disconnected);
        socket.on("close", disconnected);
        const firstTimer = setTimeout(() => {
            void finish("No Claude launch request was received.");
        }, 5000);
        socket.once("close", () => clearTimeout(firstTimer));
        socket.once("message", (raw, binary) => {
            clearTimeout(firstTimer);
            socket.pause();
            void (async () => {
                let payload: unknown;
                try {
                    payload = binary ? undefined : JSON.parse(raw.toString());
                } catch {}
                const parsed = agentRunSchema.safeParse(payload);
                if (!parsed.success)
                    throw new Error(
                        "Cannot start Claude: invalid launch request.",
                    );
                const input = parsed.data;
                if (!input.terminalContext)
                    throw new Error(
                        "Web foreground requires authenticated terminal context.",
                    );
                const networkId =
                    input.network === undefined
                        ? null
                        : (
                              await this.daemon.services.networks.require(
                                  input.network,
                              )
                          ).id;
                if (ended) return;
                // Registration itself creates no vendor resource and cannot lose a spawn handle.
                const registration = await this.daemon.registerRuntime({
                    networkId,
                    ...(input.name === undefined ? {} : { name: input.name }),
                    ...(input.role === undefined ? {} : { role: input.role }),
                    ...(input.description === undefined
                        ? {}
                        : { description: input.description }),
                    ...(input.terminalContext === undefined
                        ? {}
                        : { terminalContext: input.terminalContext }),
                    createBinding: (controls) => {
                        binding = new ClaudeBinding(controls);
                        return binding;
                    },
                });
                runtimeId = registration.runtimeId;
                if (ended) {
                    await this.daemon.stopRuntime(runtimeId, true);
                    return;
                }
                const current = binding!;
                current.requireMcp = networkId !== null;
                await current.prepare();
                const hooks = launchHooks();
                const prepared = await prepareClaudeLaunch({
                    args: input.args,
                    cwd: input.cwd,
                    env: input.env,
                    inboxPath: current.inboxPath,
                    mcpUrl: networkId === null ? null : registration.mcpUrl,
                    instruction: [collaborationInstruction, input.instruction]
                        .filter(Boolean)
                        .join("\n\n"),
                    hooks,
                });
                await probeClaude("claude", prepared.env, input.cwd);
                if (ended) return;
                current.observationOptions.hasBlockingStopHooks =
                    prepared.hasBlockingStopHooks;
                const env = Object.fromEntries(
                    Object.entries(prepared.env).filter(
                        ([key]) => !key.toUpperCase().startsWith("AIOX_"),
                    ),
                );
                this.#hooks.set(current.hookToken, current);
                const listener: TerminalListener = {
                    data: (chunk) => {
                        if (!ended && socket.readyState === socket.OPEN)
                            socket.send(chunk);
                    },
                    exit: (event) => {
                        if (ended) return;
                        this.daemon.services.runtimes.revoke(
                            current.controls.runtimeId,
                        );
                        void (async () => {
                            try {
                                await current.processExited(
                                    event.exitCode,
                                    event.signal,
                                );
                            } finally {
                                await finish(
                                    current.wasReady
                                        ? undefined
                                        : "Claude exited before its inbox and hooks became ready. Check the vendor startup output and try again.",
                                    event,
                                );
                            }
                        })().catch(() => {});
                    },
                };
                await current.start({
                    args: prepared.args,
                    env: {
                        ...env,
                        AIOX_MCP_TOKEN: registration.token,
                        AIOX_HOOK_TOKEN: current.hookToken,
                        AIOX_HOOK_URL: `http://127.0.0.1:${this.daemon.ports.daemon}/api/claude/hooks`,
                    },
                    cwd: input.cwd,
                    cols: input.cols,
                    rows: input.rows,
                    initialListener: listener,
                });
                const session = current.session!;
                detach = session.subscribe(listener);
                if (ended) {
                    detach();
                    return;
                }

                socket.on("message", (data, isBinary) => {
                    if (ended) return;
                    if (isBinary)
                        session.write(
                            Array.isArray(data)
                                ? Buffer.concat(data)
                                : Buffer.isBuffer(data)
                                  ? data
                                  : Buffer.from(data),
                        );
                    else {
                        try {
                            const resize = resizeSchema.safeParse(
                                JSON.parse(data.toString()),
                            );
                            if (resize.success)
                                session.resize(
                                    resize.data.cols,
                                    resize.data.rows,
                                );
                        } catch {}
                    }
                });
                socket.resume();
                readyTimer = setTimeout(() => {
                    if (!current.wasReady)
                        void finish(
                            "Claude inbox and hooks did not become ready within 60 seconds. Check Claude startup and hook settings, then try again.",
                        );
                }, 60_000);
                readyTimer.unref();
            })().catch((error: unknown) =>
                finish(
                    error instanceof Error
                        ? error.message
                        : "Cannot start Claude.",
                ),
            );
        });
    }
}

function launchHooks(): Record<string, unknown> {
    const hook = claudeHookCommand(
        process.execPath,
        fileURLToPath(new URL("./claude-hook.js", import.meta.url)),
    );
    return Object.fromEntries(
        [
            "SessionStart",
            "UserPromptSubmit",
            "Stop",
            "StopFailure",
            "PermissionRequest",
            "PreToolUse",
            "PostToolUse",
            "PostToolUseFailure",
            "Elicitation",
            "ElicitationResult",
            "Notification",
        ].map((name) => [name, [{ hooks: [hook] }]]),
    );
}
