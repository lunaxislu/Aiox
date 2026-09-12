import { execFile } from "node:child_process";

import { ConfigError } from "@/schema";
import type { TerminalLaunch } from "@/terminal";

// Pass paths as arguments, never interpolate user input into a shell program.
const checkDirectory = `
target=$1
case "$target" in '~') target=$HOME;; '~/'*) target=$HOME/\${target#??};; esac
[ -d "$target" ] && [ -x "$target" ] && CDPATH= cd -- "$target" || exit 1
printf '%s\\0' "$PWD"
`;

/** Validate inside the selected distribution/user without running its launch command. */
export async function resolveWslLaunch(
    file: string,
    args: string[],
    cwd?: string,
): Promise<TerminalLaunch> {
    const selectors: string[] = [];
    const launchArgs: string[] = [];
    let argumentCwd: string | undefined;
    for (let index = 0; index < args.length; index++) {
        const arg = args[index]!;
        if (["--distribution", "-d", "--user", "-u", "--cd"].includes(arg)) {
            const value = args[++index];
            if (!value)
                throw new ConfigError(`terminal.args: ${arg} requires a value`);
            if (arg === "--cd") argumentCwd = value;
            else {
                selectors.push(arg, value);
                launchArgs.push(arg, value);
            }
        } else if (arg === "~") {
            argumentCwd = "~";
        } else if (
            arg === "--exec" ||
            arg === "-e" ||
            arg === "--" ||
            !arg.startsWith("-")
        ) {
            launchArgs.push(...args.slice(index));
            break;
        } else {
            throw new ConfigError(
                `terminal.args: cannot validate WSL launch option ${arg}; use distribution/user selectors and a command after --exec`,
            );
        }
    }
    const target = cwd ?? argumentCwd ?? ".";
    const hostCwd = process.cwd();
    const resolved = await new Promise<string>((resolve, reject) => {
        execFile(
            file,
            [
                ...selectors,
                "--exec",
                "/bin/sh",
                "-c",
                checkDirectory,
                "aiox-cwd",
                target,
            ],
            {
                cwd: hostCwd,
                encoding: "utf8",
                timeout: 10000,
                maxBuffer: 65536,
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new ConfigError(
                            `terminal.cwd: cannot access ${JSON.stringify(target)} in WSL (${selectors.join(" ") || "default distribution/user"}): ${stderr.trim() || error.message}`,
                        ),
                    );
                    return;
                }
                if (
                    !stdout.startsWith("/") ||
                    !stdout.endsWith("\0") ||
                    stdout.slice(0, -1).includes("\0")
                ) {
                    reject(
                        new ConfigError(
                            "terminal.cwd: WSL did not confirm its starting directory",
                        ),
                    );
                    return;
                }
                resolve(stdout.slice(0, -1));
            },
        );
    });
    return {
        file,
        args: ["--cd", resolved, ...launchArgs],
        cwd: hostCwd,
        displayCwd: resolved,
    };
}
