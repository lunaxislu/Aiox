import { once } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";

import { createLocalServer } from "../../apps/server/src/index.js";
import {
  controlWebSocketUrl,
  createReconnectingGatewayClient,
  serverStopMethod,
  serverStopResultSchema,
  type GatewayTransportHandlers,
  type ReconnectGatewayTransport,
} from "../../packages/protocol/src/index.js";

async function connectWebSocket(url: string): Promise<ReconnectGatewayTransport> {
  const socket = new WebSocket(url);
  await once(socket, "open");
  return {
    send: (data) => socket.send(data),
    subscribe(handlers: GatewayTransportHandlers) {
      const message = (data: Buffer): void => handlers.message(data.toString());
      const close = (code: number, reason: Buffer): void =>
        handlers.close({ code, reason: reason.toString() });
      socket.on("message", message);
      socket.on("close", close);
      return () => {
        socket.off("message", message);
        socket.off("close", close);
      };
    },
    close: () => socket.close(),
  };
}

describe("server.stop Gateway operation", () => {
  it("rejects normal blockers, then force bypasses only the guard and cleans the server", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-server-stop-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    const sessionTokenFile = path.join(root, "runtime", "session.token");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");
    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile,
      serverEpoch: "epoch-stop",
      port: 0,
    });
    const endpoint = await server.start();
    const credential = (await readFile(sessionTokenFile, "utf8")).trim();
    server.shutdown.registerDependency({ kind: "agent", id: "agent-live" });
    let requestId = 0;
    const lifecycles: string[] = [];
    const statuses: string[] = [];
    const client = createReconnectingGatewayClient({
      getCredential: () => credential,
      createRequestId: () => `stop-${requestId++}`,
      connect: () => connectWebSocket(controlWebSocketUrl(endpoint)),
      onSnapshot: (snapshot) => lifecycles.push(snapshot.server.lifecycle),
      onEvent: (event) => {
        const payload = event.payload as { data: { lifecycle: string } };
        lifecycles.push(payload.data.lifecycle);
      },
      onStatus: (status) => statuses.push(status),
      waitBeforeReconnect: () => new Promise(() => {}),
    });

    try {
      await client.start();
      await expect(
        client.request(serverStopMethod, { force: false }, serverStopResultSchema),
      ).resolves.toEqual({
        accepted: false,
        force: false,
        blockers: [{ kind: "agent", id: "agent-live" }],
        residualRisk: false,
      });
      expect(server.gatewayState.snapshot().server.lifecycle).toBe("running");
      expect((await fetch(endpoint.origin)).status).toBe(200);

      await expect(
        client.request(serverStopMethod, { force: true }, serverStopResultSchema),
      ).resolves.toEqual({
        accepted: true,
        force: true,
        blockers: [{ kind: "agent", id: "agent-live" }],
        residualRisk: true,
      });

      await vi.waitFor(() =>
        expect(server.gatewayState.snapshot().server.lifecycle).toBe("stopped"),
      );
      await expect(access(endpointFile)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(access(sessionTokenFile)).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(lifecycles).toEqual([
        "running",
        "quiescing",
        "running",
        "quiescing",
        "stopping",
        "stopped",
      ]);
      expect(statuses).toContain("reconnecting");
    } finally {
      client.stop();
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });
});
