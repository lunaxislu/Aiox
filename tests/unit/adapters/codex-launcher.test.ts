import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

describe("Codex launcher", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("launches attach TUI as a CLI child with inherited stdio", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import("../../../src/adapters/codex/launcher.js");

    expect(
      launchCodexTui({
        endpoint: new URL("ws://127.0.0.1:54321/"),
      }),
    ).toBe(child);
    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      ["--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });

  it("launches resume TUI with codex resume <session-id> --remote <endpoint>", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import("../../../src/adapters/codex/launcher.js");

    expect(
      launchCodexTui({
        endpoint: new URL("ws://127.0.0.1:54321/"),
        resumeSessionId: "thread-1",
      }),
    ).toBe(child);
    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      ["resume", "thread-1", "--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });

  it("uses AIOX_CODEX_TUI_COMMAND for TUI launch when command is not provided", async () => {
    vi.stubEnv("AIOX_CODEX_TUI_COMMAND", "/tmp/aiox-test-codex-tui");
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    launchCodexTui({
      endpoint: new URL("ws://127.0.0.1:54321/"),
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "/tmp/aiox-test-codex-tui",
      ["--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });

  it("uses AIOX_CODEX_APP_SERVER_COMMAND for app-server launch when command is not provided", async () => {
    vi.stubEnv("AIOX_CODEX_APP_SERVER_COMMAND", "/tmp/aiox-test-codex-app-server");
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexAppServer } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    const launched = launchCodexAppServer({
      bannerTimeoutMs: 1_000,
      readyzTimeoutMs: 50,
      totalTimeoutMs: 1_000,
    });
    emitAppServerBanner(child);
    await launched;

    expect(spawnMock).toHaveBeenCalledWith(
      "/tmp/aiox-test-codex-app-server",
      ["app-server", "--listen", "ws://127.0.0.1:0"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  });

  it("prefers an explicit TUI command over AIOX_CODEX_TUI_COMMAND", async () => {
    vi.stubEnv("AIOX_CODEX_TUI_COMMAND", "/tmp/aiox-test-codex-tui");
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    launchCodexTui({
      command: "/tmp/explicit-codex-tui",
      endpoint: new URL("ws://127.0.0.1:54321/"),
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "/tmp/explicit-codex-tui",
      ["--remote", "ws://127.0.0.1:54321/"],
      {
        stdio: "inherit",
      },
    );
  });

  it("injects aiox MCP config into app-server launch args when mcp config is provided", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexAppServer } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    const launched = launchCodexAppServer({
      bannerTimeoutMs: 1_000,
      readyzTimeoutMs: 50,
      totalTimeoutMs: 1_000,
      mcp: {
        agentName: "impl",
        agentToken: "tok-123",
        daemonSocketPath: "/tmp/aiox.sock",
        runtimeBinary: "/usr/bin/node",
        aioxBin: "/abs/aiox.js",
      },
    });
    emitAppServerBanner(child);
    await launched;

    const [, args, spawnOptions] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { stdio: unknown; env?: NodeJS.ProcessEnv },
    ];
    expect(args.slice(0, 3)).toEqual([
      "app-server",
      "--listen",
      "ws://127.0.0.1:0",
    ]);
    expect(args[3]).toBe("-c");
    const inline = args[4];
    expect(inline).toMatch(/^mcp_servers\.aiox = \{/);
    expect(inline).toContain('command = "/usr/bin/node"');
    expect(inline).toContain('"/abs/aiox.js"');
    expect(inline).toContain('"mcp-codex"');

    // The inline TOML must declare only the env var *names* to whitelist for
    // forwarding, never the secret values.
    expect(inline).toContain("env_vars = [");
    expect(inline).toContain('"AIOX_CODEX_AGENT_NAME"');
    expect(inline).toContain('"AIOX_CODEX_AGENT_TOKEN"');
    expect(inline).toContain('"AIOX_SOCKET_PATH"');

    // The raw token must never appear anywhere in spawn argv.
    expect(args.some((arg) => arg.includes("tok-123"))).toBe(false);

    // The actual values are delivered only through the child process
    // environment, so Codex can forward them by name via `env_vars`.
    expect(spawnOptions.stdio).toEqual(["ignore", "pipe", "pipe"]);
    expect(spawnOptions.env).toMatchObject({
      AIOX_CODEX_AGENT_NAME: "impl",
      AIOX_CODEX_AGENT_TOKEN: "tok-123",
      AIOX_SOCKET_PATH: "/tmp/aiox.sock",
    });
  });

  it("uses tsx for a dev TypeScript MCP entry while preserving Node for a built entry", async () => {
    const { buildCodexMcpArgs } = await import(
      "../../../src/adapters/codex/launcher.js"
    );
    const mcp = {
      agentName: "impl",
      agentToken: "tok-123",
      daemonSocketPath: "/tmp/aiox.sock",
    };

    const [, devInline] = buildCodexMcpArgs({
      ...mcp,
      aioxBin: "/repo/src/bin/aiox.ts",
    });
    const [, buildInline] = buildCodexMcpArgs({
      ...mcp,
      aioxBin: "/repo/dist/src/bin/aiox.js",
    });

    expect(devInline).toContain('command = "tsx"');
    expect(devInline).toContain('args = ["/repo/src/bin/aiox.ts", "mcp-codex"]');
    expect(buildInline).toContain(`command = "${process.execPath}"`);
    expect(buildInline).toContain(
      'args = ["/repo/dist/src/bin/aiox.js", "mcp-codex"]',
    );
  });

  it("falls back to no mcp args when mcp option is absent", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexTui } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    launchCodexTui({
      endpoint: new URL("ws://127.0.0.1:54321/"),
    });

    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args).toEqual(["--remote", "ws://127.0.0.1:54321/"]);
  });

  it("prefers an explicit app-server command over AIOX_CODEX_APP_SERVER_COMMAND", async () => {
    vi.stubEnv("AIOX_CODEX_APP_SERVER_COMMAND", "/tmp/aiox-test-codex-app-server");
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { launchCodexAppServer } = await import(
      "../../../src/adapters/codex/launcher.js"
    );

    const launched = launchCodexAppServer({
      command: "/tmp/explicit-codex-app-server",
      bannerTimeoutMs: 1_000,
      readyzTimeoutMs: 50,
      totalTimeoutMs: 1_000,
    });
    emitAppServerBanner(child);
    await launched;

    expect(spawnMock).toHaveBeenCalledWith(
      "/tmp/explicit-codex-app-server",
      ["app-server", "--listen", "ws://127.0.0.1:0"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  });
});

function fakeChild(): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  Object.assign(child, {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    exitCode: null,
    signalCode: null,
    killed: false,
    kill: vi.fn(),
  });
  return child;
}

function emitAppServerBanner(child: ChildProcess): void {
  child.stderr?.emit(
    "data",
    Buffer.from(
      [
        "listening on: ws://127.0.0.1:54321",
        "readyz: http://127.0.0.1:54321/readyz",
        "healthz: http://127.0.0.1:54321/healthz",
        "",
      ].join("\n"),
    ),
  );
}
