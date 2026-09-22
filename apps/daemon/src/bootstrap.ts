import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AioxConfig, PortOverrides } from "@aiox/config";
import { loadConfig, resolveTerminalLaunch } from "@aiox/config";
import { openDatabase } from "@aiox/persistence";
import type { DaemonState } from "@aiox/protocol";

import type { Daemon } from "@/daemon";
import { startDaemon } from "@/daemon";

export function databasePath(home: string = homedir()): string {
    return join(home, ".aiox", "aiox.db");
}

export function statePath(home: string = homedir()): string {
    return join(home, ".aiox", "daemon.json");
}

/**
 * Built Web assets, if the Web has been built. Resolved from this module so it
 * works from `dist` in a workspace checkout.
 */
export function webRoot(): string | undefined {
    const here = dirname(fileURLToPath(import.meta.url));
    // ponytail: workspace layout. A published npm artifact resolves @aiox/web
    // as a dependency instead (Stage 8).
    return join(here, "..", "..", "web", "dist");
}

export type BootOptions = {
    home?: string;
    /** Snapshot prepared by the starting CLI; subsequent shells still reload the file. */
    config?: AioxConfig;
    portOverrides?: PortOverrides;
    webRoot?: string | undefined;
};

/**
 * Reads the global settings, prepares the database and starts listening. A
 * database that cannot be prepared is a startup failure, never an empty
 * fallback and never a reason to delete an existing file.
 */
export async function boot(
    options: BootOptions = {},
): Promise<{ daemon: Daemon; stateFile: string }> {
    const home = options.home ?? homedir();
    const config =
        options.config ??
        (await loadConfig({
            home,
            ...(options.portOverrides === undefined
                ? {}
                : { portOverrides: options.portOverrides }),
        }));
    await resolveTerminalLaunch(config.terminal);
    const db = await openDatabase(databasePath(home));
    const stateFile = statePath(home);
    let daemon: Daemon;
    try {
        daemon = await startDaemon({
            home,
            ports: config.ports,
            terminal: async () => (await loadConfig({ home })).terminal,
            db,
            retentionDays: () => config.messages.retentionDays,
            webRoot:
                options.webRoot === undefined ? webRoot() : options.webRoot,
            onListening: async (ports) => {
                const state: DaemonState = {
                    pid: process.pid,
                    ports,
                    startedAt: Date.now(),
                };
                await mkdir(dirname(stateFile), { recursive: true });
                await writeFile(
                    stateFile,
                    `${JSON.stringify(state, null, 2)}\n`,
                    { mode: 0o600 },
                );
            },
            onClosing: () => rm(stateFile, { force: true }),
        });
    } catch (error) {
        await db.close();
        throw error;
    }

    return { daemon, stateFile };
}

export class InvalidPortError extends Error {
    readonly code = "EINVALIDPORT";
    constructor(readonly field: "--port" | "--web-port") {
        super(`${field} needs an integer from 1 to 65535`);
    }
}

/** `--port` and `--web-port`, mirroring the CLI flags that spawn this process. */
export function portOverrides(argv: readonly string[]): PortOverrides {
    const overrides: PortOverrides = {};
    for (let index = 0; index < argv.length; index++) {
        const flag = argv[index];
        const value = Number(argv[index + 1]);
        if (flag !== "--port" && flag !== "--web-port") continue;
        if (!Number.isInteger(value) || value < 1 || value > 65535)
            throw new InvalidPortError(flag);
        if (flag === "--port") overrides.daemon = value;
        else overrides.web = value;
        index++;
    }
    return overrides;
}
