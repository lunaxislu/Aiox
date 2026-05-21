import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createSocketRuntime, runAioxCli } from "../../../src/bin/aiox.js";
import type { InvocationRuntime } from "../../../src/cli/invocation.js";
import type { DaemonApi } from "../../../src/daemon/api.js";

describe("aiox CLI bin", () => {
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
      });
      const api = await runtime.getDaemonApi();

      expect(code).toBe(0);
      expect(written.stderrText()).toBe("");
      expect((await api.status()).agents).toEqual([
        {
          id: "cli-1",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: null,
          adapterSessionId: "thread-1",
        },
      ]);
    } finally {
      await runtime.close();
    }
  });

  it("keeps package bin aligned with the compiled src/bin entrypoint", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
    ) as { bin: { aiox: string }; scripts: { dev: string } };

    expect(manifest.bin.aiox).toBe("./dist/src/bin/aiox.js");
    expect(manifest.scripts.dev).toBe("tsx src/bin/aiox.ts");
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
    status: () => ({ daemon: { startedAt: "2026-05-19T00:00:00.000Z" }, agents: [], pairs: [], routes: [] }),
    stop: () => ({ ok: true, stoppedAgents: [] }),
    ...daemonApiOverrides,
  } as unknown as DaemonApi;

  return {
    getDaemonApi: () => api,
    startDaemon: () => ({ ok: true }),
    stopDaemon: () => ({ ok: true, stoppedAgents: [] }),
    restartDaemon: () => ({ ok: true }),
    daemonStatus: () => ({ ok: true }),
    doctor: () => ({ ok: true }),
  };
}
