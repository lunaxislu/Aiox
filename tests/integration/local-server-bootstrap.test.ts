import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { createLocalServer } from "../../apps/server/src/index.js";
import {
  controlWebSocketUrl,
  endpointDiscoverySchema,
} from "../../packages/protocol/src/index.js";

describe("Local Server bootstrap", () => {
  it("listens only on IPv4 loopback and serves the static index", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(
      path.join(staticDirectory, "index.html"),
      "<!doctype html><title>AIOX</title>",
    );

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-1",
      port: 0,
    });

    try {
      const [endpoint, duplicateStart] = await Promise.all([
        server.start(),
        server.start(),
      ]);
      expect(duplicateStart).toEqual(endpoint);
      const origin = new URL(endpoint.origin);
      expect(origin.hostname).toBe("127.0.0.1");
      expect(Number(origin.port)).toBeGreaterThan(0);

      const response = await fetch(new URL("/", origin));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "text/html; charset=utf-8",
      );
      await expect(response.text()).resolves.toBe(
        "<!doctype html><title>AIOX</title>",
      );
    } finally {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("atomically publishes owner-only endpoint discovery and removes it on stop", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-discovery",
      port: 0,
      pid: 4242,
    });

    try {
      const endpoint = await server.start();
      const persisted = endpointDiscoverySchema.parse(
        JSON.parse(await readFile(endpointFile, "utf8")),
      );
      expect(persisted).toEqual(endpoint);
      expect(persisted).toMatchObject({
        pid: 4242,
        serverEpoch: "epoch-discovery",
      });
      expect((await stat(endpointFile)).mode & 0o777).toBe(0o600);

      await server.stop();
      await expect(access(endpointFile)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not remove discovery that belongs to a newer server epoch", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-old",
      port: 0,
    });

    try {
      await server.start();
      const newerEndpoint = endpointDiscoverySchema.parse({
        origin: "http://127.0.0.1:49999",
        pid: 9999,
        serverEpoch: "epoch-new",
      });
      await writeFile(endpointFile, `${JSON.stringify(newerEndpoint)}\n`, {
        mode: 0o600,
      });

      await server.stop();

      expect(
        endpointDiscoverySchema.parse(
          JSON.parse(await readFile(endpointFile, "utf8")),
        ),
      ).toEqual(newerEndpoint);
    } finally {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("serves only GET and HEAD static files without creating an HTTP domain API", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(path.join(staticDirectory, "assets"), { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");
    await writeFile(
      path.join(staticDirectory, "assets", "app.js"),
      "globalThis.aiox = true;",
    );

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-static",
      port: 0,
    });

    try {
      const endpoint = await server.start();
      const assetUrl = `${endpoint.origin}/assets/app.js`;

      const asset = await fetch(assetUrl);
      expect(asset.status).toBe(200);
      expect(asset.headers.get("content-type")).toBe(
        "text/javascript; charset=utf-8",
      );
      await expect(asset.text()).resolves.toBe("globalThis.aiox = true;");

      const head = await fetch(assetUrl, { method: "HEAD" });
      expect(head.status).toBe(200);
      await expect(head.text()).resolves.toBe("");

      expect(
        (await fetch(`${endpoint.origin}/`, { method: "POST" })).status,
      ).toBe(405);
      expect((await fetch(`${endpoint.origin}/api/runtime`)).status).toBe(404);
    } finally {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("upgrades only the canonical Control WebSocket path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");
    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-control",
      port: 0,
    });
    let socket: WebSocket | undefined;

    try {
      const endpoint = await server.start();
      socket = new WebSocket(controlWebSocketUrl(endpoint));
      await once(socket, "open");

      const denied = new WebSocket(
        `${endpoint.origin.replace(/^http:/, "ws:")}/ws/terminal/not-stage-2`,
      );
      const [deniedError] = (await once(denied, "error")) as [Error];
      expect(deniedError.message).toContain("Unexpected server response: 404");
    } finally {
      if (socket?.readyState === WebSocket.OPEN) {
        const closed = once(socket, "close");
        socket.close();
        await closed;
      }
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("closes connected Control WebSockets before completing stop", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const endpointFile = path.join(root, "runtime", "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-stop-socket",
      port: 0,
    });
    let socket: WebSocket | undefined;

    try {
      const endpoint = await server.start();
      socket = new WebSocket(controlWebSocketUrl(endpoint));
      await once(socket, "open");
      const closed = once(socket, "close");

      await server.stop();

      await expect(closed).resolves.toBeDefined();
      expect(socket.readyState).toBe(WebSocket.CLOSED);
      await expect(access(endpointFile)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      socket?.terminate();
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cleans listener and temporary discovery after readiness publication fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "aiox-local-server-"));
    const staticDirectory = path.join(root, "static");
    const runtimeDirectory = path.join(root, "runtime");
    const endpointFile = path.join(runtimeDirectory, "endpoint.json");
    await mkdir(staticDirectory, { recursive: true });
    await mkdir(endpointFile, { recursive: true });
    await writeFile(path.join(staticDirectory, "index.html"), "AIOX");

    const server = createLocalServer({
      staticDirectory,
      endpointFile,
      sessionTokenFile: path.join(root, "runtime", "session.token"),
      serverEpoch: "epoch-failed-readiness",
      port: 0,
    });

    try {
      await expect(server.start()).rejects.toBeInstanceOf(Error);
      expect(await readdir(runtimeDirectory)).toEqual(["endpoint.json"]);
      await expect(server.stop()).resolves.toBeUndefined();
    } finally {
      await server.stop();
      await rm(root, { recursive: true, force: true });
    }
  });
});
