import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, open, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { claudeAdapter } from "@aiox/adapter-claude";
import type { PortOverrides } from "@aiox/config";
import { configPath, loadConfig, resolveTerminalLaunch } from "@aiox/config";
import type {
    AgentView,
    DaemonState,
    DaemonStatus,
    NetworkView,
    RouteOperation,
} from "@aiox/protocol";
import {
    agentViewSchema,
    agentRunSchema,
    apiPath,
    daemonStateSchema,
    daemonStatusSchema,
    deletedResultSchema,
    errorBodySchema,
    networkViewSchema,
    stopResultSchema,
    terminalContextFromEnv,
} from "@aiox/protocol";
import { selectVendor } from "@aiox/vendor";
import { WebSocket } from "ws";

import { runExternal } from "@/external";
import { runForeground } from "@/foreground";
import type { CliOptions, CliPort, CliRequest, CommandName } from "@/requests";

const execFileAsync = promisify(execFile);
const probeTimeoutMs = 2_000;
const requestTimeoutMs = 15_000;
const startTimeoutMs = 20_000;
const shutdownTimeoutMs = 10_000;

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function origin(port: number): string {
    return `http://127.0.0.1:${port}`;
}

function overrides(options: CliOptions): PortOverrides {
    return {
        ...(options.port === undefined ? {} : { daemon: options.port }),
        ...(options.webPort === undefined ? {} : { web: options.webPort }),
    };
}

/** Commander guarantees required operands; this narrows the parsed value. */
function operand(args: CliRequest["args"], index: number): string {
    const value = args[index];
    if (typeof value !== "string")
        throw new Error(`Missing operand ${index + 1}`);
    return value;
}

function post(body: unknown): RequestInit {
    return {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}

/** An error code carries its own fields, so report them instead of only the code. */
function describeError(status: number, body: unknown, text: string): string {
    const parsed = errorBodySchema.safeParse(body);
    if (!parsed.success)
        return `daemon responded ${status}: ${text.trim() || "<empty body>"}`;
    const { code, message: reason, ...extra } = parsed.data;
    return [
        `${reason} [${code}]`,
        ...Object.entries(extra).map(
            ([key, value]) => `${key}: ${JSON.stringify(value)}`,
        ),
    ].join("\n  ");
}

async function call(
    url: string,
    path: string,
    init: RequestInit = {},
): Promise<unknown> {
    let response: Response;
    try {
        response = await fetch(`${url}${path}`, {
            signal: AbortSignal.timeout(requestTimeoutMs),
            ...init,
        });
    } catch (error) {
        throw new Error(
            `Cannot reach the AIOX daemon at ${url} (${message(error)}). ` +
                "Start it with 'aiox daemon start'.",
        );
    }
    const text = await response.text();
    let body: unknown;
    try {
        body = text === "" ? undefined : JSON.parse(text);
    } catch {
        body = undefined;
    }
    if (!response.ok)
        throw new Error(describeError(response.status, body, text));
    return body;
}

/** null means the probe did not answer, which is not proof that no daemon exists. */
async function probe(url: string): Promise<DaemonStatus | null> {
    try {
        const response = await fetch(`${url}${apiPath.status}`, {
            signal: AbortSignal.timeout(probeTimeoutMs),
        });
        if (!response.ok) return null;
        return daemonStatusSchema.parse(await response.json());
    } catch {
        return null;
    }
}

function alive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

function routeOperation(options: CliOptions): RouteOperation {
    if (options.default !== undefined)
        return { kind: "default", policy: options.default };
    if (options.resetDefault) return { kind: "reset-default" };
    for (const policy of ["allow", "deny", "reset"] as const) {
        const agents = options[`${policy}Between`];
        if (agents !== undefined) return { kind: "between", policy, agents };
        const from = options[`${policy}From`];
        if (from !== undefined)
            return { kind: "directed", policy, from, to: options.to ?? [] };
    }
    throw new Error("Specify exactly one routing operation");
}

function describeStatus(status: DaemonStatus): string {
    return (
        `daemon running (pid ${status.pid}) on port ${status.ports.daemon}, ` +
        `web ${status.ports.web} — ${status.runtimes} runtime(s), ` +
        `${status.networks} network(s)`
    );
}

function describeNetwork(network: NetworkView): string {
    return [
        `${network.name} (${network.scope}, default ${network.defaultPolicy}, ` +
            `${network.routes.length} route(s))`,
        ...network.routes.map(
            (route) => `  ${route.from} -> ${route.to}: ${route.policy}`,
        ),
    ].join("\n");
}

function describeAgent(agent: AgentView): string {
    return [
        `${agent.name} [${agent.activity}]`,
        agent.role === null ? "" : ` role=${agent.role}`,
        agent.networkId === null ? "" : ` network=${agent.networkId}`,
        agent.hostId === null ? "" : ` host=${agent.hostId}`,
    ].join("");
}

function lines(values: string[], empty: string): string {
    return values.length === 0 ? empty : values.join("\n");
}

function query(pairs: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(pairs))
        if (value !== undefined) search.set(key, value);
    return search.size === 0 ? "" : `?${search}`;
}

function unavailable(command: CommandName): never {
    const stage = command.startsWith("host.")
        ? "Stage 5 (declarative Host, Worktree and multi-run CLI operations)"
        : "Stage 3 and Stage 4 (Claude and Codex TUI runtime integration)";
    throw new Error(
        `${command.replaceAll(".", " ")} arrives in ${stage}. ` +
            "No operation was performed.",
    );
}

export type CliHome = { home?: string };

/** Drives the daemon over its HTTP contract; parsing stays free of I/O in cli.ts. */
export function createFoundationPort(location: CliHome = {}): CliPort {
    const home = location.home ?? homedir();
    const directory = join(home, ".aiox");
    const stateFile = join(directory, "daemon.json");
    const logFile = join(directory, "daemon.log");

    // The recorded port is what a running daemon actually bound, override
    // included; the configuration is the fallback when nothing is recorded.
    const daemonUrl = async (options: CliOptions = {}): Promise<string> =>
        origin(
            (await readState())?.ports.daemon ??
                (await loadConfig({ home, portOverrides: overrides(options) }))
                    .ports.daemon,
        );

    /** The daemon owns this file; the CLI only reads what it recorded. */
    async function readState(): Promise<DaemonState | null> {
        try {
            return daemonStateSchema.parse(
                JSON.parse(await readFile(stateFile, "utf8")),
            );
        } catch {
            return null;
        }
    }

    async function tail(count = 20): Promise<string> {
        try {
            const text = await readFile(logFile, "utf8");
            return (
                text.split("\n").filter(Boolean).slice(-count).join("\n") ||
                "(daemon.log is empty)"
            );
        } catch {
            return `(no daemon log at ${logFile})`;
        }
    }

    async function start(
        options: CliOptions,
        restarting = false,
    ): Promise<string> {
        const config = await loadConfig({
            home,
            portOverrides: overrides(options),
        });
        const url = origin(config.ports.daemon);
        // Check the port this start would use and the port a recorded daemon
        // actually bound, so an override cannot start a second daemon.
        const recorded = (await readState())?.ports.daemon;
        let live: DaemonStatus | null = null;
        if (restarting) {
            live = await probe(origin(recorded ?? config.ports.daemon));
            if (recorded !== undefined && recorded !== config.ports.daemon) {
                const target = await probe(url);
                if (target && target.pid !== live?.pid)
                    throw new Error(
                        `Configured daemon port ${config.ports.daemon} already belongs to another daemon; nothing was stopped.`,
                    );
            }
        } else {
            for (const candidate of new Set([config.ports.daemon, recorded])) {
                if (candidate === undefined) continue;
                live = await probe(origin(candidate));
                if (live)
                    return `daemon already running (pid ${live.pid}) on port ${candidate}. Nothing was started.`;
            }
        }
        await resolveTerminalLaunch(config.terminal);
        // ponytail: the daemon build is a workspace sibling of the CLI build.
        // Packaging (Stage 8) has to resolve it as a dependency instead.
        const entry = fileURLToPath(
            new URL("../../daemon/dist/main.js", import.meta.url),
        );
        if (!existsSync(entry)) {
            throw new Error(
                `Daemon build not found at ${entry}. ` +
                    "Build it first: pnpm --filter @aiox/daemon build",
            );
        }
        await mkdir(directory, { recursive: true });
        const log = await open(logFile, "a");
        let child: ReturnType<typeof spawn> | undefined;
        try {
            if (restarting && live) {
                if (
                    live.ports.daemon !== config.ports.daemon ||
                    live.ports.web !== config.ports.web
                )
                    process.stderr.write(
                        `Restart uses current config: daemon ${live.ports.daemon} -> ${config.ports.daemon}, web ${live.ports.web} -> ${config.ports.web}. Previous CLI port overrides are not retained.\n`,
                    );
                const previousUrl = origin(live.ports.daemon);
                try {
                    await stop({}, previousUrl);
                } catch (error) {
                    throw new Error(
                        `daemon restart aborted and the running daemon was kept. ${message(error)}`,
                    );
                }
                const deadline = Date.now() + shutdownTimeoutMs;
                while (await probe(previousUrl)) {
                    if (Date.now() >= deadline)
                        throw new Error(
                            `daemon still answers ${previousUrl} after a successful stop; no second daemon was started.`,
                        );
                    await delay(200);
                }
            }
            child = spawn(process.execPath, [entry, "--config-stdin"], {
                detached: true,
                windowsHide: true,
                stdio: ["pipe", log.fd, log.fd],
            });
            let failure: Error | undefined;
            child.on("error", (error) => {
                failure = error;
            });
            child.stdin!.on("error", (error) => {
                failure = error;
            });
            child.stdin!.end(JSON.stringify({ home, config }));
            const deadline = Date.now() + startTimeoutMs;
            for (;;) {
                if (failure) throw failure;
                if (child.exitCode !== null || child.signalCode !== null) break;
                const status = await probe(url);
                if (failure) throw failure;
                if (status && status.pid === child.pid) {
                    child.unref();
                    return `daemon started (pid ${status.pid}) on port ${status.ports.daemon}, web ${status.ports.web}. Log: ${logFile}`;
                }
                if (Date.now() >= deadline) break;
                await delay(250);
            }
            throw new Error(
                `daemon did not answer ${url}${apiPath.status} within ` +
                    `${startTimeoutMs / 1000}s (exit code ${child.exitCode ?? "none"}). ` +
                    `Last lines of ${logFile}:\n${await tail()}`,
            );
        } catch (error) {
            // Only the process spawned by this attempt is ours to clean up.
            if (
                child?.pid !== undefined &&
                child.exitCode === null &&
                child.signalCode === null
            )
                child.kill("SIGTERM");
            throw error;
        } finally {
            await log.close();
        }
    }

    async function stop(options: CliOptions, url?: string): Promise<string> {
        const force = Boolean(options.force);
        const result = stopResultSchema.parse(
            await call(
                url ?? (await daemonUrl()),
                apiPath.daemonStop,
                post({ force }),
            ),
        );
        const warnings = result.warnings ?? [];
        const detail =
            warnings.length === 0
                ? ""
                : `\n  unconfirmed: ${warnings.join("\n  unconfirmed: ")}`;
        if (!result.stopped) {
            throw new Error(
                `daemon reported an incomplete stop; it is not confirmed stopped.${detail}`,
            );
        }
        return `daemon stopped${result.forced ? " (forced)" : ""}.${detail}`;
    }

    async function status(options: CliOptions): Promise<unknown> {
        const recorded = await readState();
        const port =
            recorded?.ports.daemon ?? (await loadConfig({ home })).ports.daemon;
        const url = origin(port);
        const live = await probe(url);
        const report = {
            state: live
                ? "running"
                : recorded
                  ? "unreachable"
                  : "no-state-file",
            port,
            stateFile,
            detail: "",
            ...(live ? { daemon: live } : {}),
            ...(recorded ? { recorded, pidAlive: alive(recorded.pid) } : {}),
        };
        if (live) report.detail = describeStatus(live);
        else if (!recorded) {
            report.detail =
                `No daemon state file at ${stateFile}, and port ${port} did not answer. ` +
                "No daemon appears to have been started by this CLI, but a failed probe is not proof that none is running.";
        } else if (alive(recorded.pid)) {
            report.detail =
                `Process ${recorded.pid} from ${stateFile} still exists, but port ${port} did not answer. ` +
                "The daemon may still be starting or wedged; a failed probe is not proof that it is gone.";
        } else {
            report.detail =
                `Process ${recorded.pid} from ${stateFile} is gone and port ${port} did not answer. ` +
                "The state file is stale.";
        }
        return options.json ? report : report.detail;
    }

    async function doctor(): Promise<unknown> {
        const recorded = await readState();
        const config = await loadConfig({ home }).then(
            (value) => ({ path: configPath(home), ports: value.ports }),
            (error: unknown) => ({
                path: configPath(home),
                error: message(error),
            }),
        );
        let git: { available: boolean; version?: string; error?: string };
        try {
            const { stdout } = await execFileAsync("git", ["--version"], {
                timeout: 5000,
            });
            git = { available: true, version: stdout.trim() };
        } catch (error) {
            git = { available: false, error: message(error) };
        }
        const port =
            recorded?.ports.daemon ??
            ("ports" in config ? config.ports.daemon : undefined);
        const live = port === undefined ? null : await probe(origin(port));
        return {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            environment:
                process.platform === "linux" &&
                Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP)
                    ? "wsl"
                    : "native",
            config,
            git,
            daemon: {
                reachable: live !== null,
                ...(port === undefined ? {} : { port }),
                ...(live === null
                    ? {}
                    : {
                          pid: live.pid,
                          runtimes: live.runtimes,
                          networks: live.networks,
                      }),
            },
            vendorIntegration:
                "Claude foreground launch; Codex integration pending",
        };
    }

    async function runAgent(request: CliRequest): Promise<void> {
        const adapter = selectVendor([claudeAdapter], operand(request.args, 0));
        const { name, network, role, description, instruction } =
            request.options;
        const parsed = agentRunSchema.safeParse({
            adapter: adapter.id,
            cwd: process.cwd(),
            env: Object.fromEntries(
                Object.entries(process.env).filter(
                    ([, value]) => value !== undefined,
                ),
            ),
            args: request.adapterArgs ?? [],
            cols: process.stdout.columns ?? 80,
            rows: process.stdout.rows ?? 24,
            name,
            network,
            role,
            description,
            instruction,
            terminalContext: terminalContextFromEnv(process.env),
        });
        if (!parsed.success)
            throw new Error("Invalid vendor launch options or environment.");
        const url = await daemonUrl();
        const external = parsed.data.terminalContext === undefined;
        const socket = new WebSocket(
            `${url.replace(/^http:/, "ws:")}/api/agent-run${external ? "/external" : ""}`,
            { handshakeTimeout: requestTimeoutMs },
        );
        // Keep the error listener through the handshake-to-relay handoff.
        let connectError: () => void = () => {};
        try {
            await new Promise<void>((resolve, reject) => {
                connectError = () =>
                    reject(
                        new Error(
                            `Cannot reach the AIOX daemon at ${url}. Start it with 'aiox daemon start'.`,
                        ),
                    );
                socket.once("open", resolve);
                socket.on("error", connectError);
                socket.once("close", connectError);
            });
            let execution;
            if (external) {
                const {
                    cols: _cols,
                    rows: _rows,
                    terminalContext: _context,
                    ...launch
                } = parsed.data;
                execution = runExternal(socket, launch, adapter);
            } else {
                socket.send(JSON.stringify(parsed.data));
                execution = runForeground(socket);
            }
            const result = await execution;
            process.exitCode =
                result.signal === null ? result.exitCode : 128 + result.signal;
        } finally {
            // Keep the handshake guard through asynchronous launcher preparation too.
            socket.terminate();
        }
    }

    return {
        async execute(request) {
            const { args, command, options } = request;
            switch (command) {
                case "doctor":
                    return doctor();
                case "daemon.start":
                    return start(options);
                case "daemon.stop":
                    return stop(options);
                case "daemon.restart":
                    return start({}, true);
                case "daemon.status":
                    return status(options);
                case "status": {
                    const body = await call(await daemonUrl(), apiPath.status);
                    return options.json
                        ? body
                        : describeStatus(daemonStatusSchema.parse(body));
                }
                case "network.create": {
                    const body = await call(
                        await daemonUrl(),
                        apiPath.networks,
                        post({
                            name: operand(args, 0),
                            defaultPolicy: options.default ?? "allow",
                        }),
                    );
                    return `created ${describeNetwork(networkViewSchema.parse(body))}`;
                }
                case "network.delete": {
                    const name = operand(args, 0);
                    const body = await call(
                        await daemonUrl(),
                        apiPath.network(name),
                        { method: "DELETE" },
                    );
                    return deletedResultSchema.parse(body).deleted
                        ? `deleted network ${name}`
                        : `network ${name} was not deleted`;
                }
                case "network.list": {
                    const body = await call(
                        await daemonUrl(),
                        `${apiPath.networks}${query({ all: options.all ? "1" : undefined })}`,
                    );
                    if (options.json) return body;
                    return lines(
                        networkViewSchema
                            .array()
                            .parse(body)
                            .map(describeNetwork),
                        "no networks",
                    );
                }
                case "network.show": {
                    const body = await call(
                        await daemonUrl(),
                        apiPath.network(operand(args, 0)),
                    );
                    return options.json
                        ? body
                        : describeNetwork(networkViewSchema.parse(body));
                }
                case "network.route": {
                    const body = await call(
                        await daemonUrl(),
                        apiPath.networkRoute(operand(args, 0)),
                        post({ operation: routeOperation(options) }),
                    );
                    return describeNetwork(networkViewSchema.parse(body));
                }
                case "agent.list": {
                    const body = await call(
                        await daemonUrl(),
                        `${apiPath.agents}${query({
                            network: options.network,
                            host: options.host,
                            all: options.all ? "1" : undefined,
                        })}`,
                    );
                    if (options.json) return body;
                    return lines(
                        agentViewSchema.array().parse(body).map(describeAgent),
                        "no agents",
                    );
                }
                case "agent.run":
                    return runAgent(request);
                case "agent.show": {
                    const body = await call(
                        await daemonUrl(),
                        apiPath.agent(operand(args, 0)),
                    );
                    return options.json
                        ? body
                        : describeAgent(agentViewSchema.parse(body));
                }
                default:
                    return unavailable(command);
            }
        },
    };
}
