import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { promisify, stripVTControlCharacters } from "node:util";

import { logger } from "@aiox/diagnostics";
import type { ExecutionProcess, VendorAdapter } from "@aiox/vendor";
import { z } from "zod";

import { CodexBinding, connectionSchema } from "@/binding";
import { createRelay } from "@/relay";

const commandSchema = z.strictObject({
    file: z.literal("codex"),
    args: z.array(z.string()),
    cwd: z.string().min(1),
    env: z.record(z.string(), z.string()),
});
const launchSchema = z.strictObject({
    instruction: z.string(),
    server: commandSchema,
    tui: commandSchema,
});

export const codexAdapter: VendorAdapter = {
    id: "codex",
    async createExecution(owner) {
        owner.signal.throwIfAborted();
        const relay = await createRelay();
        await owner.own(() => relay.close());
        return {
            connection: relay.connection,
            async start(value, executionOwner) {
                executionOwner.signal.throwIfAborted();
                const launch = launchSchema.parse(value);
                try {
                    const { stdout } = await promisify(execFile)(
                        "codex",
                        ["--help"],
                        {
                            cwd: launch.tui.cwd,
                            env: launch.tui.env,
                            timeout: 10_000,
                            signal: executionOwner.signal,
                        },
                    );
                    if (!stdout.includes("--remote-auth-token-env"))
                        throw new Error("unsupported");
                } catch {
                    executionOwner.signal.throwIfAborted();
                    throw new Error(
                        "Codex with --remote and --remote-auth-token-env support is required. Check installation and PATH.",
                    );
                }
                executionOwner.signal.throwIfAborted();
                const token = randomBytes(32).toString("base64url");
                const server = await executionOwner.background({
                    ...launch.server,
                    args: [
                        ...launch.server.args,
                        "--listen",
                        "ws://127.0.0.1:0",
                        "--ws-auth",
                        "capability-token",
                        "--ws-token-sha256",
                        createHash("sha256").update(token).digest("hex"),
                    ],
                });
                let diagnostic = "";
                const secrets = [
                    token,
                    relay.connection.token,
                    relay.tuiToken,
                    launch.server.env.AIOX_MCP_TOKEN,
                ].filter((v): v is string => Boolean(v));
                const sanitize = (value: string) =>
                    stripVTControlCharacters(
                        secrets.reduce(
                            (result, secret) =>
                                result.split(secret).join("[redacted]"),
                            value,
                        ),
                    );
                let serverExit: Awaited<ExecutionProcess["exited"]> | undefined;
                let foreground: ExecutionProcess | undefined;
                void server.exited.then((exit) => {
                    serverExit = exit;
                    if (executionOwner.signal.aborted) return;
                    const reason = `Codex App Server exited (${exit.exitCode}). ${sanitize(diagnostic).slice(-2000)}`;
                    relay.fail(reason);
                    logger.error(
                        {
                            component: "codex",
                            exitCode: exit.exitCode,
                            signal: exit.signal,
                        },
                        "Codex App Server exited",
                    );
                    void foreground
                        ?.stop()
                        .catch(() =>
                            relay.fail(
                                "Codex TUI termination after App Server failure is unconfirmed.",
                            ),
                        );
                });
                const url = await new Promise<string>((resolve, reject) => {
                    let timer: ReturnType<typeof setTimeout>;
                    const finish = (error?: Error, url?: string) => {
                        clearTimeout(timer);
                        executionOwner.signal.removeEventListener(
                            "abort",
                            aborted,
                        );
                        if (error) reject(error);
                        else resolve(url!);
                    };
                    const aborted = () =>
                        finish(new Error("Codex startup cancelled."));
                    const read = (chunk: Buffer) => {
                        diagnostic = (diagnostic + chunk.toString()).slice(
                            -16_384,
                        );
                        const found = diagnostic.match(
                            /listening on: (ws:\/\/127\.0\.0\.1:[1-9][0-9]*)[\r\n]/,
                        );
                        if (found) finish(undefined, found[1]);
                    };
                    server.stderr?.on("data", read);
                    // Drain both streams; App Server's listener announcement is stderr in 0.153.4.
                    server.stdout?.on("data", () => {});
                    timer = setTimeout(
                        () =>
                            finish(
                                new Error(
                                    `Codex App Server startup timed out. ${sanitize(diagnostic).slice(-2000)}`,
                                ),
                            ),
                        15_000,
                    );
                    executionOwner.signal.addEventListener("abort", aborted, {
                        once: true,
                    });
                    if (executionOwner.signal.aborted) aborted();
                    void server.exited.then(() =>
                        finish(
                            new Error(
                                `Codex App Server failed before TUI launch. ${sanitize(diagnostic).slice(-2000)}`,
                            ),
                        ),
                    );
                });
                if (serverExit)
                    throw new Error(
                        "Codex App Server exited before TUI launch.",
                    );
                executionOwner.signal.throwIfAborted();
                relay.setUpstream(url, token, launch.instruction);
                foreground = await executionOwner.foreground({
                    ...launch.tui,
                    args: [
                        "--remote",
                        relay.connection.url,
                        "--remote-auth-token-env",
                        "AIOX_CODEX_RELAY_TOKEN",
                        ...launch.tui.args,
                    ],
                    env: {
                        ...launch.tui.env,
                        AIOX_CODEX_RELAY_TOKEN: relay.tuiToken,
                    },
                });
                if (serverExit) await foreground.stop();
                return foreground;
            },
        };
    },
    createBinding(controls, connection) {
        return new CodexBinding(controls, connectionSchema.parse(connection));
    },
};
