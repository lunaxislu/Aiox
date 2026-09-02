import { execFile } from "node:child_process";
import { once } from "node:events";
import { promisify } from "node:util";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import {
  endpointDiscoverySchema,
  gatewaySnapshotSchema,
  responseFrameSchema,
  sessionCredentialSchema,
} from "../../packages/protocol/src/index.js";

const execFileAsync = promisify(execFile);

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function waitUntil(check: () => Promise<boolean> | boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for the Local Server to clean up");
}

async function pathIsAbsent(file: string): Promise<boolean> {
  try {
    await access(file);
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }
}

async function nextJson(socket: WebSocket): Promise<unknown> {
  const [data] = (await once(socket, "message")) as [Buffer];
  return JSON.parse(data.toString());
}

describe("built aiox lifecycle entry", () => {
  it("runs start, status, doctor, and stop through the executable entry", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-cli-bin-"));
    const runtimeDirectory = path.join(root, "runtime");
    const staticDirectory = path.resolve("apps/web/dist");
    const cliEntry = path.resolve("apps/cli/dist/index.js");
    const environment = {
      ...process.env,
      AIOX_RUNTIME_DIR: runtimeDirectory,
      AIOX_WEB_STATIC_DIR: staticDirectory,
      AIOX_SERVER_ENTRY: path.resolve("apps/server/dist/index.js"),
    };
    let serverPid: number | undefined;
    let browserSocket: WebSocket | undefined;
    const run = (args: string[]) =>
      execFileAsync(process.execPath, [cliEntry, ...args], { env: environment });

    try {
      const start = await run(["start", "--no-open"]);
      expect(start.stdout).toMatch(/Local Server started at http:\/\/127\.0\.0\.1:/);
      const endpoint = endpointDiscoverySchema.parse(
        JSON.parse(
          await readFile(path.join(runtimeDirectory, "endpoint.json"), "utf8"),
        ),
      );
      serverPid = endpoint.pid;

      const htmlResponse = await fetch(endpoint.origin);
      expect(htmlResponse.headers.get("content-type")).toBe(
        "text/html; charset=utf-8",
      );
      const html = await htmlResponse.text();
      expect(html).toContain('<div id="root"></div>');
      const script = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
      const stylesheet = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];
      expect(script).toBeDefined();
      expect(stylesheet).toBeDefined();
      expect((await fetch(new URL(script!, endpoint.origin))).status).toBe(200);
      expect((await fetch(new URL(stylesheet!, endpoint.origin))).status).toBe(200);

      const sessionTokenFile = path.join(runtimeDirectory, "session.token");
      const credential = sessionCredentialSchema.parse(
        (await readFile(sessionTokenFile, "utf8")).trim(),
      );
      expect((await stat(sessionTokenFile)).mode & 0o777).toBe(0o600);
      browserSocket = new WebSocket(
        `${endpoint.origin.replace(/^http:/, "ws:")}/ws/control`,
        { origin: endpoint.origin },
      );
      await once(browserSocket, "open");
      browserSocket.send(
        JSON.stringify({
          type: "req",
          id: "browser-subscribe",
          method: "gateway.subscribe",
          params: { credential },
        }),
      );
      const subscription = responseFrameSchema.parse(
        await nextJson(browserSocket),
      );
      expect(subscription.ok).toBe(true);
      if (!subscription.ok) throw new Error("expected browser subscription");
      expect(gatewaySnapshotSchema.parse(subscription.payload)).toMatchObject({
        server: { epoch: endpoint.serverEpoch, lifecycle: "running" },
      });

      const status = await run(["status", "--json"]);
      expect(JSON.parse(status.stdout)).toMatchObject({
        running: true,
        endpoint: { pid: serverPid, serverEpoch: endpoint.serverEpoch },
        snapshot: { server: { lifecycle: "running" } },
      });
      const doctor = await run(["doctor", "--json"]);
      expect(JSON.parse(doctor.stdout)).toMatchObject({ ok: true });
      expect(JSON.parse(doctor.stdout).checks).toHaveLength(4);

      const browserClosed = once(browserSocket, "close");
      const stop = await run(["stop"]);
      expect(JSON.parse(stop.stdout)).toEqual({
        accepted: true,
        force: false,
        blockers: [],
        residualRisk: false,
      });
      await browserClosed;
      await waitUntil(async () =>
        Promise.all([
          pathIsAbsent(path.join(runtimeDirectory, "endpoint.json")),
          pathIsAbsent(path.join(runtimeDirectory, "session.token")),
          pathIsAbsent(path.join(runtimeDirectory, "server.lock")),
        ]).then((values) => values.every(Boolean)),
      );
      await waitUntil(() => !processIsAlive(serverPid!));
    } finally {
      browserSocket?.terminate();
      try {
        const endpoint = endpointDiscoverySchema.parse(
          JSON.parse(
            await readFile(path.join(runtimeDirectory, "endpoint.json"), "utf8"),
          ),
        );
        if (endpoint.pid === serverPid) process.kill(endpoint.pid, "SIGTERM");
      } catch {
        // Successful stop removes discovery; failed setup may never create it.
      }
      if (serverPid && processIsAlive(serverPid)) process.kill(serverPid, "SIGTERM");
      await rm(root, { recursive: true, force: true });
    }
  });
});
