import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { join } from "node:path";
import type { ChildProcess } from "node:child_process";

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "opaque CLI default message"),
  createPublicDeliveryId: vi.fn(() => "opaque CLI default delivery"),
}));

import {
  createClientRuntime,
  createSocketRuntime,
  runAioxCliMain,
  resolveDaemonForkCommand,
  runAioxCli,
} from "../../../src/bin/aiox.js";
import type { InvocationRuntime } from "../../../src/cli/invocation.js";
import { createPublicDeliveryId } from "../../../src/core/public-ids.js";
import type { DaemonApi } from "../../../src/daemon/api.js";

describe("aiox CLI bin", () => {
  it("does not force-exit a successful long-running MCP command", async () => {
    const exit = vi.fn();

    await runAioxCliMain({
      run: async () => 0,
      exit,
    });

    expect(exit).not.toHaveBeenCalled();
  });

  it("force-exits a failed command with its error status", async () => {
    const exit = vi.fn();

    await runAioxCliMain({
      run: async () => 1,
      exit,
    });

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("disposes its client runtime after a successful ordinary command", async () => {
    const dispose = vi.fn();

    const code = await runAioxCli(["status"], {
      runtime: {
        ...createRuntime(),
        dispose,
      },
      cwd: "/repo",
    });

    expect(code).toBe(0);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("closes daemon socket clients when a production runtime is disposed", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const owner = createSocketRuntime({ socketPath });
    const runtime = createClientRuntime({ socketPath });

    try {
      await owner.startDaemon();
      const api = await runtime.getDaemonApi();
      await api.status();

      await runtime.dispose?.();

      await expect(api.status()).rejects.toThrow("daemon socket client is closed");
    } finally {
      await owner.close();
    }
  });

  it("prints parser-captured help and exits successfully", async () => {
    const written = createWritableBuffers();

    const code = await runAioxCli(["--help"], {
      stdout: written.stdout,
      stderr: written.stderr,
      runtime: createRuntime(),
      cwd: "/repo",
      version: "9.8.7",
    });

    expect(code).toBe(0);
    expect(written.stdoutText()).toContain("Usage: aiox");
    expect(written.stderrText()).toBe("");
  });

  it("prints parser-captured version and exits successfully", async () => {
    const written = createWritableBuffers();

    const code = await runAioxCli(["--version"], {
      stdout: written.stdout,
      stderr: written.stderr,
      runtime: createRuntime(),
      cwd: "/repo",
      version: "9.8.7",
    });

    expect(code).toBe(0);
    expect(written.stdoutText()).toBe("9.8.7\n");
    expect(written.stderrText()).toBe("");
  });

  it("returns parse error exit codes unchanged", async () => {
    const written = createWritableBuffers();

    const code = await runAioxCli(["connect", "impl"], {
      stdout: written.stdout,
      stderr: written.stderr,
      runtime: createRuntime(),
      cwd: "/repo",
    });

    expect(code).toBe(1);
    expect(written.stdoutText()).toBe("");
    expect(written.stderrText()).toContain("At least one target is required");
  });

  it("returns invocation error exit codes and messages", async () => {
    const written = createWritableBuffers();

    const code = await runAioxCli(["connect", "missing", "reviewer"], {
      stdout: written.stdout,
      stderr: written.stderr,
      runtime: createRuntime({
        connect: () => ({
          ok: false,
          reason: "source_agent_not_found",
          sourceName: "missing",
        }),
      }),
      cwd: "/repo",
    });

    expect(code).toBe(1);
    expect(written.stdoutText()).toBe("");
    expect(written.stderrText()).toContain("Invocation failed: source_agent_not_found");
  });

  it("uses the socket runtime for default daemon API dispatch", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const runtime = createSocketRuntime({
      socketPath,
      attachCodexRuntime: async () => fakeCodexRuntime(),
    });
    const written = createWritableBuffers();

    try {
      const code = await runAioxCli(["codex", "--name", "impl"], {
        stdout: written.stdout,
        stderr: written.stderr,
        runtime,
        cwd: "/repo",
        launchCodexTui: () => {
          const child = new EventEmitter() as ChildProcess;
          setTimeout(() => child.emit("exit", 0, null), 0);
          return child;
        },
      });
      const api = await runtime.getDaemonApi();

      expect(code).toBe(0);
      expect(written.stderrText()).toBe("");
      expect((await api.status()).agents).toEqual([
        {
          id: "cli-1",
          name: "impl",
          kind: "codex",
          status: "disconnected",
          cwd: "/repo",
          pairId: null,
        },
      ]);
    } finally {
      await runtime.close();
    }
  });

  it("uses the core public delivery default through the CLI in-process runtime", async () => {
    vi.mocked(createPublicDeliveryId).mockReset();
    vi.mocked(createPublicDeliveryId).mockReturnValue("opaque CLI default delivery");
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const runtime = createSocketRuntime({ socketPath });

    try {
      const api = await runtime.getDaemonApi();
      await api.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
      await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
      await api.connect({ sourceName: "source", targetNames: ["target"] });
      const result = await api.sendMessage({
        sourceName: "source",
        messageId: "source-issued",
        type: "question",
        content: "hello",
      });

      if (!result.ok) throw new Error("expected accepted message");
      expect(createPublicDeliveryId).toHaveBeenCalledOnce();
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0]?.id).toBe("opaque CLI default delivery");
    } finally {
      await runtime.close();
    }
  });

  it("returns daemon process metadata from the socket runtime", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const runtime = createSocketRuntime({
      socketPath,
      dbPath: "/tmp/aiox-test.sqlite",
      version: "9.8.7-test",
    });

    try {
      await runtime.startDaemon();
      await expect(runtime.daemonStatus()).resolves.toEqual({
        running: true,
        pid: process.pid,
        socketPath,
        dbPath: "/tmp/aiox-test.sqlite",
        startedAt: expect.any(String),
        version: "9.8.7-test",
      });
    } finally {
      await runtime.close();
    }
  });

  it("does not start the daemon when reading daemon status", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const runtime = createSocketRuntime({
      socketPath,
      version: "9.8.7-test",
    });

    try {
      await expect(runtime.daemonStatus()).resolves.toEqual({
        running: false,
        socketPath,
        dbPath: ":memory:",
        version: "9.8.7-test",
      });
      expect(existsSync(socketPath)).toBe(false);
    } finally {
      await runtime.close();
    }
  });

  it("reads daemon status from an existing socket without owning the daemon handle", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const owner = createSocketRuntime({
      socketPath,
      version: "owner-version",
    });
    const reader = createSocketRuntime({
      socketPath,
      version: "reader-version",
    });

    try {
      await owner.startDaemon();

      await expect(reader.daemonStatus()).resolves.toEqual({
        running: true,
        pid: process.pid,
        socketPath,
        dbPath: ":memory:",
        startedAt: expect.any(String),
        version: "reader-version",
      });
    } finally {
      await reader.close();
      await owner.close();
    }
  });

  it("includes the daemon pid in API status for remote status readers", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-bin-"), "daemon.sock");
    const runtime = createSocketRuntime({ socketPath });

    try {
      const api = await runtime.getDaemonApi();

      await expect(api.status()).resolves.toMatchObject({
        daemon: {
          pid: process.pid,
          startedAt: expect.any(String),
        },
      });
    } finally {
      await runtime.close();
    }
  });

  it("keeps package bin aligned with the compiled src/bin entrypoint", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { bin: { aiox: string }; scripts: { dev: string } };

    expect(manifest.bin.aiox).toBe("./dist/src/bin/aiox.js");
    // dev runs the tsx src entrypoint and injects the dev runtime profile (R4).
    expect(manifest.scripts.dev).toBe("AIOX_PROFILE=dev tsx src/bin/aiox.ts");
  });

  it("forks the daemon through tsx in the pnpm dev TypeScript layout", () => {
    expect(
      resolveDaemonForkCommand({
        binPath: "/repo/src/bin/aiox.ts",
        socketPath: "/tmp/aiox.sock",
      }),
    ).toEqual({
      command: "tsx",
      args: ["/repo/src/bin/aiox.ts", "_run-daemon", "--socket", "/tmp/aiox.sock"],
    });
  });

  it("forks the daemon through node in the built JavaScript layout", () => {
    expect(
      resolveDaemonForkCommand({
        binPath: "/repo/dist/src/bin/aiox.js",
        socketPath: "/tmp/aiox.sock",
        nodeCommand: "/usr/bin/node",
      }),
    ).toEqual({
      command: "/usr/bin/node",
      args: ["/repo/dist/src/bin/aiox.js", "_run-daemon", "--socket", "/tmp/aiox.sock"],
    });
  });
});

function createWritableBuffers(): {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
  stdoutText: () => string;
  stderrText: () => string;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout: {
      write(value: string | Uint8Array) {
        stdout.push(String(value));
        return true;
      },
    },
    stderr: {
      write(value: string | Uint8Array) {
        stderr.push(String(value));
        return true;
      },
    },
    stdoutText: () => stdout.join(""),
    stderrText: () => stderr.join(""),
  };
}

function fakeCodexRuntime() {
  return {
    state: "ready" as const,
    endpoint: new URL("ws://127.0.0.1:54321/"),
    activeThreadId: null as string | null,
    async startThread() {
      this.activeThreadId = "thread-1";
      return "thread-1";
    },
    async resumeThread(threadId: string) {
      this.activeThreadId = threadId;
      return threadId;
    },
    async listLoadedThreadIds() {
      return this.activeThreadId ? [this.activeThreadId] : [];
    },
    rebindActiveThread(threadId: string) {
      this.activeThreadId = threadId;
    },
    async dispose() {},
  };
}

function createRuntime(daemonApiOverrides: Partial<DaemonApi> = {}): InvocationRuntime {
  const api = {
    attachAgent: () => ({ ok: true, agent: {} }),
    createPair: () => ({ ok: true, pair: {} }),
    connect: () => ({ ok: true, created: [], alreadyExisted: [] }),
    disconnect: () => ({ ok: true, removed: [] }),
    sendMessage: () => ({ ok: true, message: {}, deliveries: [] }),
    status: () => ({
      daemon: { startedAt: "2026-05-19T00:00:00.000Z" },
      agents: [],
      pairs: [],
      routes: [],
      messageCount: 0,
      deliveryCounts: {
        queued: 0,
        delivering: 0,
        delivered: 0,
        completed: 0,
        failed: 0,
      },
    }),
    stop: () => ({ ok: true, stoppedAgents: [] }),
    ...daemonApiOverrides,
  } as unknown as DaemonApi;

  return {
    getDaemonApi: () => api,
    startDaemon: () => ({ ok: true }),
    stopDaemon: () => ({ ok: true, stoppedAgents: [] }),
    restartDaemon: () => ({ ok: true }),
    daemonStatus: () => ({
      running: true,
      pid: process.pid,
      socketPath: "/tmp/aiox-test.sock",
      dbPath: ":memory:",
      startedAt: "2026-05-19T00:00:00.000Z",
      version: "test-version",
    }),
    doctor: () => ({ checks: [] }),
  };
}
