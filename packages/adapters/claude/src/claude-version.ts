import { execFile } from "node:child_process";

export function checkClaudeVersion(
    output: string,
    platform: NodeJS.Platform = process.platform,
): string {
    if (!["darwin", "linux"].includes(platform))
        throw new Error("Claude inbox is unsupported on this platform");
    const match = /^(\d+)\.(\d+)\.(\d+)(?: \(Claude Code\))?$/.exec(
        output.trim(),
    );
    if (!match) throw new Error("Claude returned an invalid version");
    const [major, minor, patch] = match.slice(1).map(Number) as [
        number,
        number,
        number,
    ];
    const minimumPatch = 224;
    if (
        !Number.isSafeInteger(major) ||
        !Number.isSafeInteger(minor) ||
        !Number.isSafeInteger(patch)
    )
        throw new Error("Claude returned an invalid version");
    if (
        major < 2 ||
        (major === 2 && (minor < 1 || (minor === 1 && patch < minimumPatch)))
    )
        throw new Error(
            `Claude inbox requires version 2.1.${minimumPatch} or later`,
        );
    return `${match[1]}.${match[2]}.${match[3]}`;
}
export async function probeClaude(
    executable = "claude",
    env: NodeJS.ProcessEnv = process.env,
    cwd: string = process.cwd(),
    signal?: AbortSignal,
): Promise<string> {
    const output = await new Promise<string>((resolve, reject) => {
        execFile(
            executable,
            ["--version"],
            {
                env,
                cwd,
                encoding: "utf8",
                timeout: 5000,
                maxBuffer: 4096,
                killSignal: "SIGKILL",
                ...(signal ? { signal } : {}),
            },
            (error, stdout) => {
                if (error) reject(error);
                else resolve(stdout);
            },
        );
    }).catch((error: unknown) => {
        const failure = error as { code?: unknown; killed?: unknown } | null;
        throw new Error(
            failure?.code === "ENOENT"
                ? "Claude executable was not found"
                : failure?.code === "EACCES"
                  ? "Claude executable permission denied"
                  : failure?.killed === true &&
                      failure.code !== "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"
                    ? "Claude version probe timed out"
                    : "Claude version probe failed",
        );
    });
    return checkClaudeVersion(output);
}
