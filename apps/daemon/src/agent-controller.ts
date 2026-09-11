import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
    agentRunSchema,
    externalAgentClientFrameSchema,
    externalAgentRunSchema,
} from "@aiox/protocol";
import {
    createTerminal,
    type TerminalExit,
    type TerminalSession,
} from "@aiox/terminal";
import {
    ExecutionOwner,
    InvalidVendorReport,
    type ExecutionProcess,
    type RuntimeControls,
    selectVendor,
    type VendorAdapter,
    type VendorBinding,
    type VendorExecution,
} from "@aiox/vendor";
import type { WebSocket } from "ws";
import { z } from "zod";

import type { Daemon } from "@/daemon";
import { readJson } from "@/http";
import { bearerToken } from "@/mcp";
import { collaborationInstruction } from "@/messaging";

const resizeSchema = z.strictObject({
    type: z.literal("resize"),
    cols: z.int().positive(),
    rows: z.int().positive(),
});

/** Owns AIOX lifecycle and terminal transport, never vendor launch semantics. */
export class AgentController {
    readonly #reports = new Map<
        string,
        { runtimeId: string; binding: VendorBinding }
    >();
    constructor(
        private readonly daemon: Daemon,
        private readonly adapters: readonly VendorAdapter[],
    ) {}

    async hook(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        const report = this.#reports.get(bearerToken(request) ?? "");
        const active = () =>
            report &&
            this.daemon.services.runtimes.get(report.runtimeId)
                ?.collaborationActive;
        if (!active()) {
            response.writeHead(401).end("Invalid agent report credential.");
            return;
        }
        if (request.method !== "POST") {
            response.writeHead(405).end();
            return;
        }
        try {
            const body = await readJson(request);
            if (!active()) {
                response.writeHead(401).end("Invalid agent report credential.");
                return;
            }
            await report!.binding.observe(body);
            response.writeHead(204).end();
        } catch (error) {
            response
                .writeHead(error instanceof InvalidVendorReport ? 400 : 409)
                .end("Agent report could not be applied to this runtime.");
        }
    }

    attachExternal(socket: WebSocket): void {
        this.#attach(socket, true);
    }
    attach(socket: WebSocket): void {
        this.#attach(socket, false);
    }

    #attach(socket: WebSocket, external: boolean): void {
        let binding: VendorBinding | undefined;
        let controlsForBinding: RuntimeControls | undefined;
        let runtimeId: string | undefined;
        let reportToken: string | undefined;
        let ended = false;
        let prepared = false;
        let started = false;
        let finishing: Promise<void> | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let foreground: ExecutionProcess | undefined;
        let execution: VendorExecution | undefined;
        let preparingExecution: Promise<VendorExecution> | undefined;
        let startingExecution: Promise<ExecutionProcess> | undefined;
        let session: TerminalSession | undefined;
        const send = (frame: object) => {
            if (socket.readyState === socket.OPEN)
                socket.send(JSON.stringify(frame));
        };
        const clear = () => {
            clearTimeout(timer);
            if (reportToken) this.#reports.delete(reportToken);
        };
        const released = () => {
            clear();
            if (ended) return;
            ended = true;
            socket.resume();
            socket.close();
        };
        let dimensions = { cols: 80, rows: 24 };
        const owner = external
            ? undefined
            : new ExecutionOwner(async (command) => {
                  let resolveExit!: (exit: TerminalExit) => void;
                  const exited = new Promise<TerminalExit>((resolve) => {
                      resolveExit = resolve;
                  });
                  session = createTerminal({
                      id: runtimeId!,
                      ...command,
                      cols: dimensions.cols,
                      rows: dimensions.rows,
                      initialListener: {
                          data: (data) => {
                              if (!ended && socket.readyState === socket.OPEN)
                                  socket.send(data);
                          },
                          exit: resolveExit,
                      },
                  });
                  const current = session;
                  return {
                      exited,
                      write: (data) => current.write(data),
                      resize: (cols, rows) => current.resize(cols, rows),
                      stop: async () => {
                          await current.kill();
                          await current.dispose();
                      },
                  };
              });
        const release = async () => {
            clear();
            if (runtimeId) await this.daemon.stopRuntime(runtimeId, true);
            else await owner?.stop();
        };
        const finish = (
            message?: string,
            exit?: TerminalExit,
        ): Promise<void> => {
            finishing ??= (async () => {
                ended = true;
                clear();
                socket.resume();
                const startupFailed =
                    external &&
                    Boolean(message && prepared && !binding?.wasReady);
                if (startupFailed) send({ type: "startup-failed", message });
                try {
                    await release();
                } catch {
                    message =
                        "Agent collaboration cleanup remains unconfirmed.";
                    console.error(message);
                    send({ type: "error", message });
                    socket.close();
                    return;
                }
                if (message && !startupFailed) send({ type: "error", message });
                else if (!message && exit) send({ type: "exit", ...exit });
                socket.close();
            })();
            return finishing;
        };
        const processExited = async (exit: TerminalExit) => {
            if (ended) return;
            // Revoke immediately, but let this path return the outcome before closing.
            ended = true;
            this.daemon.services.runtimes.revoke(runtimeId!);
            try {
                await binding?.processExited(exit.exitCode, exit.signal);
            } finally {
                await finish(
                    binding?.wasReady
                        ? undefined
                        : "Vendor exited before collaboration became ready. Check the vendor startup output and try again.",
                    exit,
                );
            }
        };
        const disconnected = () => {
            if (ended) return;
            ended = true;
            clear();
            // Authority ends before asynchronous outcome persistence or resource cleanup.
            if (runtimeId) this.daemon.services.runtimes.revoke(runtimeId);
            void (async () => {
                try {
                    if (!external) await binding?.connectionLost();
                } finally {
                    await release();
                }
            })().catch(() =>
                console.error(
                    "Agent collaboration cleanup remains unconfirmed after connection loss.",
                ),
            );
        };
        socket.on("close", disconnected);
        socket.on("error", disconnected);
        timer = setTimeout(
            () => void finish("No agent launch request was received."),
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
                const parsed = (
                    external ? externalAgentRunSchema : agentRunSchema
                ).safeParse(payload);
                if (!parsed.success)
                    throw new Error(
                        "Cannot start agent: invalid launch request.",
                    );
                const input = parsed.data;
                const webInput = external
                    ? undefined
                    : agentRunSchema.parse(input);
                if (webInput && !webInput.terminalContext)
                    throw new Error(
                        "Web foreground requires authenticated terminal context.",
                    );
                if (webInput)
                    dimensions = { cols: webInput.cols, rows: webInput.rows };
                const adapter = selectVendor(this.adapters, input.adapter);
                const networkId =
                    input.network === undefined
                        ? null
                        : (
                              await this.daemon.services.networks.require(
                                  input.network,
                              )
                          ).id;
                if (ended) return;
                // The owner scope exists before resource acquisition; failed preparation remains retryable.
                const registration = await this.daemon.registerRuntime({
                    networkId,
                    executionOwnership: external ? "external" : "daemon",
                    ...(input.name === undefined ? {} : { name: input.name }),
                    ...(input.role === undefined ? {} : { role: input.role }),
                    ...(input.description === undefined
                        ? {}
                        : { description: input.description }),
                    ...(webInput?.terminalContext === undefined
                        ? {}
                        : { terminalContext: webInput.terminalContext }),
                    createBinding: (controls) => {
                        runtimeId = controls.runtimeId;
                        controlsForBinding = controls;
                        return {
                            deliver: (message) =>
                                binding
                                    ? binding.deliver(message)
                                    : Promise.reject(
                                          new Error(
                                              "Vendor input is not ready.",
                                          ),
                                      ),
                            mcpConnected: () => binding?.mcpConnected(),
                            revoke: () => {
                                clear();
                                // Web input remains usable if termination fails. External
                                // lifecycle control ends independently of its vendor process.
                                if (external) released();
                            },
                            stop: async () => {
                                await owner?.stop();
                                await preparingExecution?.catch(() => {});
                                await startingExecution?.catch(() => {});
                                await owner?.stop();
                            },
                            cleanup: async () => {
                                // For Web, owner.stop has already confirmed termination.
                                released();
                                await binding?.cleanup(
                                    external
                                        ? "external_connection_lost"
                                        : "execution_stopped",
                                );
                            },
                        };
                    },
                });
                if (
                    ended ||
                    !this.daemon.services.runtimes.get(runtimeId!)
                        ?.collaborationActive
                ) {
                    await release();
                    return;
                }
                let connection: unknown;
                if (external)
                    connection = externalAgentRunSchema.parse(input).connection;
                else {
                    preparingExecution = adapter.createExecution({
                        own: (dispose) => owner!.own(dispose),
                        signal: owner!.signal,
                    });
                    execution = await preparingExecution;
                    connection = execution.connection;
                }
                if (
                    ended ||
                    !this.daemon.services.runtimes.get(runtimeId!)
                        ?.collaborationActive
                ) {
                    await release();
                    return;
                }
                // Use the registry controls by creating the binding inside a captured controls callback.
                binding = adapter.createBinding(
                    controlsForBinding!,
                    connection,
                );
                binding.onReleased = released;
                binding.onReady = () => {
                    clearTimeout(timer);
                    if (
                        !ended &&
                        this.daemon.services.runtimes.get(runtimeId!)
                            ?.collaborationActive
                    ) {
                        if (external) send({ type: "ready" });
                    }
                };
                reportToken = randomBytes(32).toString("base64url");
                this.#reports.set(reportToken, {
                    runtimeId: registration.runtimeId,
                    binding,
                });
                const launch = await binding.prepare({
                    executionOwnership: external ? "external" : "daemon",
                    args: input.args,
                    cwd: input.cwd,
                    env: input.env,
                    mcpUrl: networkId === null ? null : registration.mcpUrl,
                    mcpToken: registration.token,
                    reportUrl: `http://127.0.0.1:${this.daemon.ports.daemon}/api/agent-hooks`,
                    reportToken,
                    instruction: [collaborationInstruction, input.instruction]
                        .filter(Boolean)
                        .join("\n\n"),
                });
                if (
                    ended ||
                    !this.daemon.services.runtimes.get(runtimeId!)
                        ?.collaborationActive
                )
                    return;
                if (external) {
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
                            void finish(
                                "Invalid external agent lifecycle frame.",
                            );
                            return;
                        }
                        if (frame.data.type === "started") {
                            started = true;
                            binding!.executionStarted();
                        } else void processExited(frame.data).catch(() => {});
                    });
                    prepared = true;
                    send({ type: "prepared", launch });
                } else {
                    startingExecution = execution!.start(launch, owner!);
                    foreground = await startingExecution;
                    if (ended) {
                        await owner!.stop();
                        return;
                    }
                    binding.executionStarted();
                    void foreground.exited.then(processExited).catch(() => {});
                    socket.on("message", (data, isBinary) => {
                        if (ended) return;
                        if (isBinary && this.daemon.acceptingInput)
                            foreground!.write(
                                Array.isArray(data)
                                    ? Buffer.concat(data)
                                    : Buffer.isBuffer(data)
                                      ? data
                                      : Buffer.from(data),
                            );
                        else
                            try {
                                const resize = resizeSchema.safeParse(
                                    JSON.parse(data.toString()),
                                );
                                if (resize.success)
                                    foreground!.resize(
                                        resize.data.cols,
                                        resize.data.rows,
                                    );
                            } catch {}
                    });
                }
                socket.resume();
                timer = setTimeout(() => {
                    if (
                        !this.daemon.services.runtimes.get(runtimeId!)
                            ?.collaborationActive
                    ) {
                        released();
                        return;
                    }
                    if (!binding!.wasReady)
                        void finish(
                            "Vendor collaboration did not become ready within 60 seconds. Check vendor startup and settings, then try again.",
                        );
                }, 60_000);
                timer.unref();
            })().catch((error: unknown) =>
                finish(
                    error instanceof Error
                        ? error.message
                        : "Cannot start agent.",
                ),
            );
        });
    }
}
