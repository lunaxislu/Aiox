import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { posix, win32 } from "node:path";

import { ConfigError, parseConfig, type AioxConfig } from "@/schema";
import { resolveWslLaunch } from "@/wsl";

export type TerminalLaunch = {
    file: string;
    args: string[];
    cwd: string;
    displayCwd?: string;
};

function defaultTerminalShell(): string {
    return process.platform === "win32"
        ? (process.env["COMSPEC"] ?? "cmd.exe")
        : (process.env["SHELL"] ?? "/bin/bash");
}

async function executable(file: string, cwd: string): Promise<string> {
    const windows = process.platform === "win32";
    const paths = windows ? win32 : posix;
    if (windows) {
        const extension = paths.extname(file).toLowerCase();
        if (!extension) file += ".exe";
        else if (extension === ".cmd" || extension === ".bat")
            throw new ConfigError(
                `terminal.shell: command scripts require an explicit command interpreter: ${file}`,
            );
    }
    const search = windows
        ? [
              paths.dirname(process.execPath),
              cwd,
              ...(process.env["SystemRoot"]
                  ? [
                        paths.join(process.env["SystemRoot"], "System32"),
                        paths.join(process.env["SystemRoot"], "System"),
                        process.env["SystemRoot"],
                    ]
                  : []),
              ...(process.env["PATH"] ?? "").split(paths.delimiter),
          ]
        : (process.env["PATH"] ?? "/usr/bin:/bin").split(paths.delimiter);
    const candidates =
        paths.isAbsolute(file) ||
        file.includes("/") ||
        (windows && file.includes("\\"))
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
    const terminal = parseConfig({
        terminal: {
            ...settings,
            shell: settings.shell ?? defaultTerminalShell(),
            ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
        },
    }).terminal!;
    const wsl =
        process.platform === "win32" &&
        /^(wsl|wsl\.exe)$/i.test(win32.basename(terminal.shell!));
    const paths = process.platform === "win32" ? win32 : posix;
    const cwd = paths.resolve(
        wsl ? process.cwd() : (terminal.cwd ?? process.cwd()),
    );
    try {
        if (!(await stat(cwd)).isDirectory())
            throw new Error("not a directory");
        await access(cwd, constants.X_OK);
        if (process.platform === "win32") {
            // Node access() does not check Windows directory ACLs. A child must
            // actually be able to use this cwd, without running the user shell.
            await new Promise<void>((done, reject) => {
                execFile(
                    process.execPath,
                    ["-e", ""],
                    { cwd, timeout: 5000, windowsHide: true },
                    (error) => (error ? reject(error) : done()),
                );
            });
        }
    } catch (error) {
        throw new ConfigError(
            `terminal.cwd: directory is unavailable: ${cwd}: ${error instanceof Error ? error.message : String(error)}`,
            wsl ? undefined : "terminal.cwd",
        );
    }
    const file = await executable(terminal.shell!, cwd);
    const args = [...(terminal.args ?? [])];
    if (wsl) return resolveWslLaunch(file, args, terminal.cwd);
    return { file, args, cwd };
}
