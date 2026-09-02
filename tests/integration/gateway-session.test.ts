import { EventEmitter, once } from "node:events";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import type { WebSocket as WsWebSocket } from "ws";
import { WebSocket } from "ws";

import { createLocalServer } from "../../apps/server/src/index.js";
import { createAuthenticatedControlSession } from "../../apps/server/src/gateway/control/authenticated-session.js";
import { createGatewayState } from "../../apps/server/src/gateway/state/gateway-state.js";
import {
  controlWebSocketUrl,
  gatewaySnapshotSchema,
  responseFrameSchema,
} from "../../packages/protocol/src/index.js";

async function fixture(authenticationTimeoutMs = 1_000) {
  const root = await mkdtemp(path.join(tmpdir(), "aiox-gateway-session-"));
  const staticDirectory = path.join(root, "static");
  const endpointFile = path.join(root, "runtime", "endpoint.json");
  const sessionTokenFile = path.join(root, "runtime", "session.token");
  await mkdir(staticDirectory, { recursive: true });
  await writeFile(path.join(staticDirectory, "index.html"), "AIOX");
  const server = createLocalServer({
    staticDirectory,
    endpointFile,
    sessionTokenFile,
    serverEpoch: "epoch-auth",
    port: 0,
    authenticationTimeoutMs,
  });
  const endpoint = await server.start();
  return { root, endpointFile, sessionTokenFile, server, endpoint };
}

async function nextJson(socket: WebSocket): Promise<unknown> {
  const [data] = (await once(socket, "message")) as [Buffer];
  return JSON.parse(data.toString());
}

describe("authenticated Gateway session", () => {
  it("runs accepted after-response work once even when the response cannot be delivered", async () => {
    class FailingSocket extends EventEmitter {
      readonly sent: string[] = [];

      send(data: string, callback?: (error?: Error) => void): void {
        this.sent.push(data);
        const frame = JSON.parse(data) as { id?: string };
        if (frame.id === "stop") {
          this.emit("close");
          callback?.(new Error("client disconnected before response flush"));
          return;
        }
        callback?.();
      }

      close(): void {}
    }

    const state = createGatewayState({ serverEpoch: "epoch-send-failure" });
    state.setServerLifecycle("running");
    const socket = new FailingSocket();
    let afterResponseCalls = 0;
    const session = createAuthenticatedControlSession({
      credential: "a".repeat(43),
      gatewayState: state,
      authenticationTimeoutMs: 1_000,
      methods: {
        "test.stop": () => ({
          payload: { accepted: true },
          afterResponse: () => {
            afterResponseCalls += 1;
          },
        }),
      },
    });
    session(
      socket as unknown as WsWebSocket,
      {} as IncomingMessage,
    );

    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "req",
          id: "subscribe",
          method: "gateway.subscribe",
          params: { credential: "a".repeat(43) },
        }),
      ),
      false,
    );
    socket.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "req",
          id: "stop",
          method: "test.stop",
        }),
      ),
      false,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(afterResponseCalls).toBe(1);
  });

  it("publishes a separate owner-only credential and preserves a newer credential", async () => {
    const value = await fixture();
    try {
      const token = (await readFile(value.sessionTokenFile, "utf8")).trim();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect((await stat(value.sessionTokenFile)).mode & 0o777).toBe(0o600);
      expect(await readFile(value.endpointFile, "utf8")).not.toContain(token);

      await writeFile(value.sessionTokenFile, `${"b".repeat(43)}\n`, {
        mode: 0o600,
      });
      await value.server.stop();
      await expect(readFile(value.sessionTokenFile, "utf8")).resolves.toBe(
        `${"b".repeat(43)}\n`,
      );
    } finally {
      await value.server.stop();
      await rm(value.root, { recursive: true, force: true });
    }
  });

  it("rejects non-canonical Host and cross-origin browser upgrades", async () => {
    const value = await fixture();
    const port = new URL(value.endpoint.origin).port;
    try {
      const wrongHost = new WebSocket(controlWebSocketUrl(value.endpoint), {
        headers: { Host: `localhost:${port}` },
      });
      const [hostError] = (await once(wrongHost, "error")) as [Error];
      expect(hostError.message).toContain("Unexpected server response: 403");

      const wrongOrigin = new WebSocket(controlWebSocketUrl(value.endpoint), {
        origin: "http://attacker.invalid",
      });
      const [originError] = (await once(wrongOrigin, "error")) as [Error];
      expect(originError.message).toContain("Unexpected server response: 403");
    } finally {
      await value.server.stop();
      await rm(value.root, { recursive: true, force: true });
    }
  });

  it("requires the credential and delivers snapshot before sequenced events", async () => {
    const value = await fixture();
    const token = (await readFile(value.sessionTokenFile, "utf8")).trim();
    let unauthorized: WebSocket | undefined;
    let authorized: WebSocket | undefined;
    try {
      unauthorized = new WebSocket(controlWebSocketUrl(value.endpoint), {
        origin: value.endpoint.origin,
      });
      await once(unauthorized, "open");
      unauthorized.send(
        JSON.stringify({
          type: "req",
          id: "bad-auth",
          method: "gateway.subscribe",
          params: { credential: "x".repeat(43) },
        }),
      );
      expect(responseFrameSchema.parse(await nextJson(unauthorized))).toEqual({
        type: "res",
        id: "bad-auth",
        ok: false,
        error: {
          code: "AUTH_FAILED",
          message: "Gateway authentication failed",
          retryable: false,
        },
      });

      authorized = new WebSocket(controlWebSocketUrl(value.endpoint), {
        origin: value.endpoint.origin,
      });
      await once(authorized, "open");
      authorized.send(
        JSON.stringify({
          type: "req",
          id: "subscribe-1",
          method: "gateway.subscribe",
          params: { credential: token },
        }),
      );
      const response = responseFrameSchema.parse(await nextJson(authorized));
      expect(response.ok).toBe(true);
      if (!response.ok) throw new Error("expected successful subscription");
      expect(gatewaySnapshotSchema.parse(response.payload)).toEqual({
        server: { epoch: "epoch-auth", lifecycle: "running" },
        stateVersion: 1,
        nextEventSeq: 1,
      });

      const eventMessage = nextJson(authorized);
      value.server.gatewayState.setServerLifecycle("quiescing");
      await expect(eventMessage).resolves.toEqual({
        type: "event",
        event: "server.lifecycle.changed",
        payload: {
          serverEpoch: "epoch-auth",
          data: { lifecycle: "quiescing" },
        },
        seq: 1,
        stateVersion: 2,
      });
    } finally {
      unauthorized?.terminate();
      authorized?.terminate();
      await value.server.stop();
      await expect(access(value.endpointFile)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await rm(value.root, { recursive: true, force: true });
    }
  });

  it("closes a Control socket that never authenticates", async () => {
    const value = await fixture(25);
    const socket = new WebSocket(controlWebSocketUrl(value.endpoint), {
      origin: value.endpoint.origin,
    });
    try {
      await once(socket, "open");
      const [code, reason] = (await once(socket, "close")) as [number, Buffer];
      expect(code).toBe(1008);
      expect(reason.toString()).toBe("AUTH_TIMEOUT");
    } finally {
      socket.terminate();
      await value.server.stop();
      await rm(value.root, { recursive: true, force: true });
    }
  });
});
