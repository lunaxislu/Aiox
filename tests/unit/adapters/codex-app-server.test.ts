import http from "node:http";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendCodexAppServerOutput,
  createCodexAppServerOutputBuffer,
  parseCodexAppServerBanner,
  waitForCodexReadyz,
} from "../../../src/adapters/codex/app-server.js";

describe("Codex app-server launch helpers", () => {
  const servers: http.Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          }),
      ),
    );
    servers.length = 0;
  });

  it("parses a stderr-first Codex app-server banner after stripping ANSI and normalizing whitespace", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(output, "stderr", "\u001b[32mcodex app-server\u001b[0m\n");
    appendCodexAppServerOutput(output, "stdout", "noise without endpoints\n");
    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "  listening on: ws://127.0.0.1:51992",
        "    readyz: http://127.0.0.1:51992/readyz",
        " healthz: http://127.0.0.1:51992/healthz",
      ].join("\n"),
    );

    expect(parseCodexAppServerBanner(output)).toEqual({
      endpoint: new URL("ws://127.0.0.1:51992"),
      readyz: new URL("http://127.0.0.1:51992/readyz"),
      healthz: new URL("http://127.0.0.1:51992/healthz"),
    });
  });

  it("keeps a bounded per-stream output ring", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 8 });

    appendCodexAppServerOutput(output, "stderr", "123456");
    appendCodexAppServerOutput(output, "stderr", "7890");
    appendCodexAppServerOutput(output, "stdout", "abcdef");

    expect(output.stderr.text).toBe("34567890");
    expect(output.stdout.text).toBe("abcdef");
  });

  it("rejects app-server banners with non-loopback endpoints", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "listening on: ws://192.0.2.1:51992",
        "readyz: http://127.0.0.1:51992/readyz",
        "healthz: http://127.0.0.1:51992/healthz",
      ].join("\n"),
    );

    expect(() => parseCodexAppServerBanner(output)).toThrow(/loopback/i);
  });

  it("rejects app-server banners with an invalid endpoint protocol", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "listening on: http://127.0.0.1:51992",
        "readyz: http://127.0.0.1:51992/readyz",
        "healthz: http://127.0.0.1:51992/healthz",
      ].join("\n"),
    );

    expect(() => parseCodexAppServerBanner(output)).toThrow(
      /app-server endpoint must use ws:/i,
    );
  });

  it("rejects app-server banners with an invalid readyz pathname", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "listening on: ws://127.0.0.1:51992",
        "readyz: http://127.0.0.1:51992/something-else",
        "healthz: http://127.0.0.1:51992/healthz",
      ].join("\n"),
    );

    expect(() => parseCodexAppServerBanner(output)).toThrow(
      /readyz URL must use \/readyz/i,
    );
  });

  it("rejects app-server banners with an invalid healthz pathname", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "listening on: ws://127.0.0.1:51992",
        "readyz: http://127.0.0.1:51992/readyz",
        "healthz: http://127.0.0.1:51992/something-else",
      ].join("\n"),
    );

    expect(() => parseCodexAppServerBanner(output)).toThrow(
      /healthz URL must use \/healthz/i,
    );
  });

  it("accepts IPv6 loopback app-server banners", () => {
    const output = createCodexAppServerOutputBuffer({ capacityBytes: 1024 });

    appendCodexAppServerOutput(
      output,
      "stderr",
      [
        "listening on: ws://[::1]:51992",
        "readyz: http://[::1]:51992/readyz",
        "healthz: http://[::1]:51992/healthz",
      ].join("\n"),
    );

    expect(parseCodexAppServerBanner(output)).toEqual({
      endpoint: new URL("ws://[::1]:51992"),
      readyz: new URL("http://[::1]:51992/readyz"),
      healthz: new URL("http://[::1]:51992/healthz"),
    });
  });

  it("waits for readyz HTTP 200 with retry polling", async () => {
    let requests = 0;
    const server = await listen((request, response) => {
      requests += 1;

      if (request.url !== "/readyz" || requests < 2) {
        response.writeHead(503).end();
        return;
      }

      response.writeHead(200).end();
    });

    await expect(
      waitForCodexReadyz(new URL(`http://127.0.0.1:${server.port}/readyz`), {
        timeoutMs: 500,
        pollIntervalMs: 10,
      }),
    ).resolves.toBeUndefined();
    expect(requests).toBeGreaterThanOrEqual(2);
  });

  it("times out when readyz never returns HTTP 200", async () => {
    const server = await listen((_request, response) => {
      response.writeHead(503).end();
    });

    await expect(
      waitForCodexReadyz(new URL(`http://127.0.0.1:${server.port}/readyz`), {
        timeoutMs: 30,
        pollIntervalMs: 5,
      }),
    ).rejects.toMatchObject({
      code: "app_server_readyz_timeout",
    });
  });

  it("fails fast when the app-server exits during readyz polling", async () => {
    const child = new EventEmitter() as ChildProcess;
    Object.assign(child, {
      exitCode: null,
      killed: false,
      pid: 123,
    });

    setTimeout(() => {
      Object.assign(child, { exitCode: 1 });
      child.emit("exit", 1, null);
    }, 5);

    await expect(
      waitForCodexReadyz(new URL("http://127.0.0.1:51992/readyz"), {
        child,
        fetchImpl: async () => new Response(null, { status: 503 }),
        pollIntervalMs: 20,
        timeoutMs: 80,
      }),
    ).rejects.toMatchObject({
      code: "app_server_process_exited_before_ready",
    });
  });

  async function listen(
    handler: http.RequestListener,
  ): Promise<{ port: number }> {
    const server = http.createServer(handler);
    servers.push(server);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected TCP server address");
    }

    return { port: address.port };
  }
});
