import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  createNodeCliPlatform,
  type CliRuntimePaths,
} from "../../apps/cli/src/node-platform.js";
import { createCliOperations } from "../../apps/cli/src/operations.js";
import { endpointDiscoverySchema } from "../../packages/protocol/src/index.js";

describe("built CLI and Local Server lifecycle", () => {
  it("starts one detached server and stops it through the authenticated Gateway", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-cli-lifecycle-"));
    const runtimeDirectory = path.join(root, "runtime");
    const staticDirectory = path.join(root, "static");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX CLI");
    const paths: CliRuntimePaths = {
      runtimeDirectory,
      endpointFile: path.join(runtimeDirectory, "endpoint.json"),
      sessionTokenFile: path.join(runtimeDirectory, "session.token"),
      serverLogFile: path.join(runtimeDirectory, "server.log"),
      staticDirectory,
      serverEntry: path.resolve("apps/server/dist/index.js"),
    };
    const operations = createCliOperations(createNodeCliPlatform(paths), {
      readinessAttempts: 100,
      readinessDelayMs: 20,
    });
    const concurrentOperations = createCliOperations(createNodeCliPlatform(paths), {
      readinessAttempts: 100,
      readinessDelayMs: 20,
    });
    let serverPid: number | undefined;

    try {
      const [started, concurrent] = await Promise.all([
        operations.start({ noOpen: true }),
        concurrentOperations.start({ noOpen: true }),
      ]);
      expect(started.started || concurrent.started).toBe(true);
      expect(concurrent.endpoint).toEqual(started.endpoint);
      serverPid = started.endpoint.pid;

      await expect(operations.status()).resolves.toMatchObject({
        running: true,
        endpoint: { pid: serverPid, serverEpoch: started.endpoint.serverEpoch },
        snapshot: { server: { lifecycle: "running" } },
      });
      await expect(operations.doctor()).resolves.toEqual({
        ok: true,
        checks: [
          { component: "endpoint", status: "ok" },
          { component: "session-credential", status: "ok" },
          { component: "gateway", status: "ok" },
          { component: "static", status: "ok" },
        ],
      });

      await expect(operations.stop({ force: false })).resolves.toEqual({
        accepted: true,
        force: false,
        blockers: [],
        residualRisk: false,
      });
      await vi.waitFor(
        async () => {
          await expect(access(paths.endpointFile)).rejects.toMatchObject({
            code: "ENOENT",
          });
          await expect(
            access(path.join(runtimeDirectory, "server.lock")),
          ).rejects.toMatchObject({ code: "ENOENT" });
          await expect(operations.status()).resolves.toEqual({ running: false });
        },
        { timeout: 2_000 },
      );
    } finally {
      try {
        const endpoint = endpointDiscoverySchema.parse(
          JSON.parse(await readFile(paths.endpointFile, "utf8")),
        );
        if (endpoint.pid === serverPid) process.kill(endpoint.pid, "SIGTERM");
      } catch {
        // The expected successful path removes discovery before process exit.
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
