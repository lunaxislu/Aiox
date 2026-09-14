import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import type { Command, VendorLaunchInput } from "@aiox/vendor";

export type CodexLaunch = {
    instruction: string;
    server: Command;
    tui: Command;
};
// JSON strings are TOML basic strings after escaping JSON's unsupported slash-free controls.
export const tomlString = (value: string) =>
    JSON.stringify(value).replace(/\u007f/g, "\\u007f");

export async function prepareLaunch(
    input: VendorLaunchInput,
): Promise<CodexLaunch> {
    let cwd = input.cwd;
    const serverArgs = ["app-server"];
    for (let i = 0; i < input.args.length; i++) {
        const arg = input.args[i]!;
        if (arg === "--") break;
        const equal = arg.indexOf("=");
        const key = equal < 0 ? arg : arg.slice(0, equal);
        if (["--remote", "--remote-auth-token-env"].includes(key))
            throw new Error(
                `${key} conflicts with the Runtime connection managed by AIOX.`,
            );
        if (
            ["exec", "app-server", "mcp-server", "remote-control"].includes(
                arg,
            ) &&
            i === 0
        )
            throw new Error("AIOX requires an interactive Codex TUI.");
        if (
            ["-c", "--config", "--enable", "--disable", "-C", "--cd"].includes(
                key,
            )
        ) {
            const value = equal < 0 ? input.args[++i] : arg.slice(equal + 1);
            if (!value || value.includes("\0"))
                throw new Error(`Missing or invalid Codex ${key} value.`);
            if (key === "-C" || key === "--cd") {
                cwd = resolve(input.cwd, value);
                continue;
            }
            if (key === "-c" || key === "--config") {
                const configKey = value
                    .split("=", 1)[0]!
                    .trim()
                    .replace(/["']/g, "");
                if (
                    configKey === "mcp_servers" ||
                    configKey === "mcp_servers.aiox" ||
                    configKey.startsWith("mcp_servers.aiox.")
                )
                    throw new Error(
                        "mcp_servers.aiox is assigned by AIOX; remove this conflicting override.",
                    );
                if (configKey === "developer_instructions")
                    throw new Error(
                        "Use the AIOX --instruction option to append execution instructions.",
                    );
                serverArgs.push("-c", value);
            } else serverArgs.push(key, value);
        }
    }
    if (!(await stat(cwd)).isDirectory())
        throw new Error("Codex working directory is not a directory.");
    for (const arg of input.args)
        if (arg.includes("\0")) throw new Error("Invalid Codex argument.");
    const env = Object.fromEntries(
        Object.entries(input.env).filter(
            ([key]) => !key.toUpperCase().startsWith("AIOX_"),
        ),
    );
    serverArgs.push(
        "-c",
        `developer_instructions=${tomlString(input.instruction)}`,
    );
    // Replace only the AIOX table, preserving all other user MCP servers.
    if (input.mcpUrl !== null)
        serverArgs.push(
            "-c",
            `mcp_servers.aiox={url=${tomlString(input.mcpUrl)},bearer_token_env_var="AIOX_MCP_TOKEN",required=true,enabled=true}`,
        );
    const base = { file: "codex", cwd, env };
    return {
        instruction: input.instruction,
        server: {
            ...base,
            args: serverArgs,
            env: { ...env, AIOX_MCP_TOKEN: input.mcpToken },
        },
        tui: { ...base, cwd: input.cwd, args: [...input.args] },
    };
}
