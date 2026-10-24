import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { posix } from "node:path";

import { ConfigError, parseConfig, type AioxConfig } from "@/schema";

export type TerminalLaunch = {
    file: string;
    args: string[];
    cwd: string;
};

function defaultTerminalShell(): string {
    return process.env["SHELL"] ?? "/bin/bash";
}

async function executable(file: string, cwd: string): Promise<string> {
    const paths = posix;
    const search = (process.env["PATH"] ?? "/usr/bin:/bin").split(
        paths.delimiter,
    );
    const candidates =
        paths.isAbsolute(file) || file.includes("/")
            ? [paths.resolve(cwd, file)]
            : search.map((part) => paths.resolve(cwd, part, file));
    for (const candidate of candidates) {
        try {
            if (!(await stat(candidate)).isFile()) continue;
            await access(candidate, constants.X_OK);
            return candidate;
        } catch {
            // Continue PATH search, including entries that cannot be traversed.
        }
    }
    throw new ConfigError(
        `terminal.shell: executable not found or not executable: ${file}`,
    );
}

export async function resolveTerminalLaunch(
    settings: AioxConfig["terminal"] = {},
    options: { cwd?: string } = {},
): Promise<TerminalLaunch> {
    if (process.platform !== "darwin" && process.platform !== "linux")
        throw new ConfigError(
            `AIOX supports macOS and Linux only; unsupported platform: ${process.platform}`,
        );
    const terminal = parseConfig({
        terminal: {
            ...settings,
            shell: settings.shell ?? defaultTerminalShell(),
            ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
        },
    }).terminal!;
    const cwd = posix.resolve(terminal.cwd ?? process.cwd());
    try {
        if (!(await stat(cwd)).isDirectory())
            throw new Error("not a directory");
        await access(cwd, constants.X_OK);
    } catch (error) {
        throw new ConfigError(
            `terminal.cwd: directory is unavailable: ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
            "terminal.cwd",
        );
    }
    const file = await executable(terminal.shell!, cwd);
    const args = [...(terminal.args ?? [])];
    return { file, args, cwd };
}
