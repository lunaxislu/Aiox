import { join } from "node:path";

import { expect, test } from "vitest";

import { prepareLaunch } from "./launch";
const input = {
    executionOwnership: "external" as const,
    cwd: process.cwd(),
    env: { PATH: process.env.PATH! },
    args: [
        "--model",
        "model-x",
        "-c",
        'model_reasoning_effort="high"',
        "--no-alt-screen",
    ],
    mcpUrl: "http://127.0.0.1:4500/mcp/network",
    mcpToken: "private-mcp-token",
    reportUrl: "",
    reportToken: "",
    instruction: 'AIOX says "hello"\nnext line',
};
test("injects per-run MCP and instructions without tokens in argv and preserves user TUI options", async () => {
    const launch = await prepareLaunch(input);
    expect(launch.server.args.join(" ")).toContain(
        'bearer_token_env_var="AIOX_MCP_TOKEN"',
    );
    expect(launch.server.args.join(" ")).toContain("required=true");
    expect(launch.server.args).toContain(
        'developer_instructions="AIOX says \\"hello\\"\\nnext line"',
    );
    expect(launch.server.env.AIOX_MCP_TOKEN).toBe(input.mcpToken);
    expect(launch.server.args.join(" ")).not.toContain(input.mcpToken);
    expect(launch.tui.args).toEqual(input.args);
    expect(launch.server.args).not.toContain("--no-alt-screen");
    expect(launch.tui.env).toEqual(input.env);
    expect(launch.server.env).toEqual({
        ...input.env,
        AIOX_MCP_TOKEN: input.mcpToken,
    });
    expect(launch.server.args).toEqual([
        "app-server",
        "-c",
        'model_reasoning_effort="high"',
        "-c",
        `developer_instructions=${JSON.stringify(input.instruction)}`,
        "-c",
        `mcp_servers.aiox={url="${input.mcpUrl}",bearer_token_env_var="AIOX_MCP_TOKEN",required=true,enabled=true}`,
    ]);
});

test.each([
    ["--remote", "ws://evil"],
    ["-c", "mcp_servers.aiox.enabled=false"],
    ["--config=mcp_servers={aiox={enabled=false}}"],
])("rejects connection overrides before launch: %j", async (...args) => {
    await expect(
        prepareLaunch({ ...input, args: args as string[] }),
    ).rejects.toThrow(/conflict|assigned/);
});
test("does not expose parent execution credentials to the child TUI", async () => {
    const launch = await prepareLaunch({
        ...input,
        mcpUrl: null,
        env: {
            ...input.env,
            AIOX_HOOK_TOKEN: "parent",
            AIOX_CODEX_RELAY_TOKEN: "parent-relay",
        },
    });
    expect(launch.tui.env).not.toHaveProperty("AIOX_HOOK_TOKEN");
    expect(launch.tui.env).not.toHaveProperty("AIOX_CODEX_RELAY_TOKEN");
    expect(launch.server.args.join(" ")).not.toContain(input.mcpUrl);
});

test("resolves a relative --cd once while preserving the TUI's launch directory", async () => {
    const launch = await prepareLaunch({ ...input, args: ["--cd", "src"] });
    expect(launch.server.cwd).toBe(join(input.cwd, "src"));
    expect(launch.tui.cwd).toBe(input.cwd);
    expect(launch.tui.args).toEqual(["--cd", "src"]);
});
