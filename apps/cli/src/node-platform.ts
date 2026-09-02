import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { openSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

import {
  type EndpointDiscovery,
  type GatewayTransportHandlers,
  type ReconnectGatewayTransport,
} from "@aiox/protocol";
import type { CliPlatform } from "./operations.js";

export interface CliRuntimePaths {
  runtimeDirectory: string;
  endpointFile: string;
  sessionTokenFile: string;
  serverLogFile: string;
  staticDirectory: string;
  serverEntry: string;
}

function validateProfile(profile: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(profile)) {
    throw new Error("AIOX profile must contain only letters, numbers, _ or -");
  }
  return profile;
}

export function resolveCliRuntimePaths(
  environment: NodeJS.ProcessEnv = process.env,
): CliRuntimePaths {
  const profile = validateProfile(environment.AIOX_PROFILE || "default");
  const runtimeDirectory =
    environment.AIOX_RUNTIME_DIR ?? path.join(homedir(), ".aiox", profile);
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  return {
    runtimeDirectory,
    endpointFile: path.join(runtimeDirectory, "endpoint.json"),
    sessionTokenFile: path.join(runtimeDirectory, "session.token"),
    serverLogFile: path.join(runtimeDirectory, "server.log"),
    staticDirectory:
      environment.AIOX_WEB_STATIC_DIR ??
      path.resolve(moduleDirectory, "../../web/dist"),
    serverEntry:
      environment.AIOX_SERVER_ENTRY ??
      path.resolve(moduleDirectory, "../../server/dist/index.js"),
  };
}

export async function connectNodeWebSocket(
  endpoint: EndpointDiscovery,
): Promise<ReconnectGatewayTransport> {
  const url = `${endpoint.origin.replace(/^http:/, "ws:")}/ws/control`;
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    const opened = (): void => {
      socket.off("error", failed);
      resolve();
    };
    const failed = (error: Error): void => {
      socket.off("open", opened);
      reject(error);
    };
    socket.once("open", opened);
    socket.once("error", failed);
  });

  return {
    send: (data) => socket.send(data),
    subscribe(handlers: GatewayTransportHandlers) {
      let closed = false;
      const reportClose = (reason: unknown): void => {
        if (closed) return;
        closed = true;
        handlers.close(reason);
      };
      const message = (data: Buffer): void => handlers.message(data.toString());
      const close = (code: number, reason: Buffer): void =>
        reportClose({ code, reason: reason.toString() });
      const error = (cause: Error): void => reportClose(cause);
      socket.on("message", message);
      socket.on("close", close);
      socket.on("error", error);
      return () => {
        socket.off("message", message);
        socket.off("close", close);
        socket.off("error", error);
      };
    },
    close() {
      if (socket.readyState === WebSocket.OPEN) socket.close();
      else if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
    },
  };
}

function waitForSpawn(
  command: string,
  args: string[],
  options: Parameters<typeof spawn>[2],
): Promise<ReturnType<typeof spawn>> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once("spawn", () => resolve(child));
    child.once("error", reject);
  });
}

export function createNodeCliPlatform(
  paths: CliRuntimePaths = resolveCliRuntimePaths(),
): CliPlatform {
  return {
    async readEndpoint() {
      return JSON.parse(await readFile(paths.endpointFile, "utf8")) as EndpointDiscovery;
    },
    async readCredential() {
      return (await readFile(paths.sessionTokenFile, "utf8")).trim();
    },
    connect: connectNodeWebSocket,
    async spawnServer(port) {
      await mkdir(paths.runtimeDirectory, { recursive: true, mode: 0o700 });
      const logDescriptor = openSync(paths.serverLogFile, "a", 0o600);
      try {
        const args = [
          paths.serverEntry,
          "--runtime-dir",
          paths.runtimeDirectory,
          "--static-dir",
          paths.staticDirectory,
        ];
        if (port !== undefined) args.push("--port", String(port));
        const child = await waitForSpawn(process.execPath, args, {
          detached: true,
          stdio: ["ignore", logDescriptor, logDescriptor],
        });
        child.unref();
      } finally {
        closeSync(logDescriptor);
      }
    },
    async openBrowser(url) {
      const [command, args] =
        process.platform === "darwin"
          ? ["open", [url]]
          : process.platform === "win32"
            ? ["cmd", ["/c", "start", "", url]]
            : ["xdg-open", [url]];
      const child = await waitForSpawn(command, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    },
    async fetchStatic(origin) {
      const response = await fetch(new URL("/", origin));
      await response.body?.cancel();
      return {
        status: response.status,
        contentType: response.headers.get("content-type"),
      };
    },
    wait(milliseconds) {
      return new Promise((resolve) => setTimeout(resolve, milliseconds));
    },
  };
}
