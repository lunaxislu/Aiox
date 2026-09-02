import { describe, expect, it } from "vitest";

import {
  createCliOperations,
  type CliPlatform,
} from "../../apps/cli/src/operations.js";
import { parseCliCommand } from "../../apps/cli/src/parse.js";
import { resolveCliRuntimePaths } from "../../apps/cli/src/node-platform.js";
import type {
  EndpointDiscovery,
  GatewayTransportHandlers,
  ReconnectGatewayTransport,
} from "../../packages/protocol/src/index.js";

const endpoint: EndpointDiscovery = {
  origin: "http://127.0.0.1:43123",
  pid: 4242,
  serverEpoch: "epoch-cli",
};
const credential = "c".repeat(43);

class CliGatewayTransport implements ReconnectGatewayTransport {
  handlers: GatewayTransportHandlers | undefined;
  stopForces: boolean[] = [];

  send(data: string): void {
    const request = JSON.parse(data) as {
      id: string;
      method: string;
      params?: { force?: boolean };
    };
    if (request.method === "gateway.subscribe") {
      this.respond(request.id, {
        server: { epoch: "epoch-cli", lifecycle: "running" },
        stateVersion: 1,
        nextEventSeq: 1,
      });
      return;
    }
    if (request.method === "server.stop") {
      this.stopForces.push(request.params?.force === true);
      this.respond(request.id, {
        accepted: true,
        force: request.params?.force === true,
        blockers: [],
        residualRisk: false,
      });
    }
  }

  private respond(id: string, payload: unknown): void {
    this.handlers?.message(
      JSON.stringify({ type: "res", id, ok: true, payload }),
    );
  }

  subscribe(handlers: GatewayTransportHandlers): () => void {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) this.handlers = undefined;
    };
  }

  close(): void {
    this.handlers?.close("test-close");
  }
}

function fakePlatform(initiallyReady: boolean) {
  let ready = initiallyReady;
  const spawnedPorts: Array<number | undefined> = [];
  const openedUrls: string[] = [];
  const transports: CliGatewayTransport[] = [];
  const platform: CliPlatform = {
    async readEndpoint() {
      if (!ready) throw new Error("endpoint absent");
      return endpoint;
    },
    async readCredential() {
      if (!ready) throw new Error("credential absent");
      return credential;
    },
    async connect() {
      if (!ready) throw new Error("server absent");
      const transport = new CliGatewayTransport();
      transports.push(transport);
      return transport;
    },
    async spawnServer(port) {
      spawnedPorts.push(port);
      ready = true;
    },
    async openBrowser(url) {
      openedUrls.push(url);
    },
    async fetchStatic() {
      return { status: 200, contentType: "text/html; charset=utf-8" };
    },
    async wait() {},
  };
  return { platform, spawnedPorts, openedUrls, transports };
}

describe("Web-first CLI operations", () => {
  it("parses only the Stage 2 root lifecycle surface", () => {
    expect(parseCliCommand(["start", "--no-open", "--port", "4567"])).toEqual({
      kind: "start",
      noOpen: true,
      port: 4567,
    });
    expect(parseCliCommand(["status", "--json"])).toEqual({
      kind: "status",
      json: true,
    });
    expect(parseCliCommand(["stop", "--force"])).toEqual({
      kind: "stop",
      force: true,
    });
    expect(() => parseCliCommand(["daemon", "restart"])).toThrow(/Usage/);
    expect(() => parseCliCommand(["start", "--port", "0"])).toThrow(
      /1 to 65535/,
    );
    expect(() =>
      resolveCliRuntimePaths({ AIOX_PROFILE: "../escape" }),
    ).toThrow(/profile/);
  });

  it("spawns an absent server, waits for readiness, and opens a fragment credential", async () => {
    const fake = fakePlatform(false);
    const operations = createCliOperations(fake.platform, {
      readinessAttempts: 2,
      readinessDelayMs: 0,
    });

    await expect(
      operations.start({ noOpen: false, port: 4567 }),
    ).resolves.toMatchObject({ started: true, endpoint });
    expect(fake.spawnedPorts).toEqual([4567]);
    expect(fake.openedUrls).toHaveLength(1);
    expect(fake.openedUrls[0]).toBe(
      `${endpoint.origin}/#session=${credential}`,
    );
    expect(new URL(fake.openedUrls[0]!).search).toBe("");
  });

  it("does not spawn or open when a healthy server already exists and --no-open is set", async () => {
    const fake = fakePlatform(true);
    const operations = createCliOperations(fake.platform);

    await expect(
      operations.start({ noOpen: true }),
    ).resolves.toMatchObject({ started: false, endpoint });
    expect(fake.spawnedPorts).toEqual([]);
    expect(fake.openedUrls).toEqual([]);
  });

  it("reads authoritative status and sends force through the Gateway", async () => {
    const fake = fakePlatform(true);
    const operations = createCliOperations(fake.platform);

    await expect(operations.status()).resolves.toEqual({
      running: true,
      endpoint,
      snapshot: {
        server: { epoch: "epoch-cli", lifecycle: "running" },
        stateVersion: 1,
        nextEventSeq: 1,
      },
    });
    await expect(operations.stop({ force: true })).resolves.toMatchObject({
      accepted: true,
      force: true,
    });
    expect(fake.transports.at(-1)?.stopForces).toEqual([true]);
  });

  it("limits doctor to endpoint, credential, Gateway, and static readiness", async () => {
    const healthy = createCliOperations(fakePlatform(true).platform);
    await expect(healthy.doctor()).resolves.toEqual({
      ok: true,
      checks: [
        { component: "endpoint", status: "ok" },
        { component: "session-credential", status: "ok" },
        { component: "gateway", status: "ok" },
        { component: "static", status: "ok" },
      ],
    });

    const absent = createCliOperations(fakePlatform(false).platform);
    const result = await absent.doctor();
    expect(result.ok).toBe(false);
    expect(result.checks.map((check) => check.component)).toEqual([
      "endpoint",
      "session-credential",
      "gateway",
      "static",
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /adapter|agent|host|network|terminal|sqlite/i,
    );
  });
});
