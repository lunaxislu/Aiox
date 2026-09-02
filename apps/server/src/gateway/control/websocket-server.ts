import type { IncomingMessage, Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer, type WebSocket } from "ws";

export interface ControlWebSocketOptions {
  onConnection: (socket: WebSocket, request: IncomingMessage) => void;
}

export interface ControlWebSocketServer {
  attach(server: Server): void;
  close(): Promise<void>;
}

export function createControlWebSocketServer(
  options: ControlWebSocketOptions,
): ControlWebSocketServer {
  const webSockets = new WebSocketServer({ noServer: true });
  webSockets.on("connection", options.onConnection);

  return {
    attach(server) {
      server.on("upgrade", (request, socket, head) => {
        const pathname = new URL(
          request.url ?? "/",
          "http://127.0.0.1",
        ).pathname;
        if (pathname !== "/ws/control") {
          socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        const address = server.address() as AddressInfo | null;
        const expectedHost = address && `127.0.0.1:${address.port}`;
        const expectedOrigin = expectedHost && `http://${expectedHost}`;
        const origin = request.headers.origin;
        if (
          !expectedHost ||
          request.headers.host !== expectedHost ||
          (origin !== undefined && origin !== expectedOrigin)
        ) {
          socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        webSockets.handleUpgrade(request, socket, head, (webSocket) => {
          webSockets.emit("connection", webSocket, request);
        });
      });
    },
    close() {
      for (const client of webSockets.clients) {
        client.close(1001, "SERVER_STOPPED");
      }
      const forceClose = setTimeout(() => {
        for (const client of webSockets.clients) client.terminate();
      }, 1_000);
      forceClose.unref();
      return new Promise((resolve, reject) => {
        webSockets.close((error) => {
          clearTimeout(forceClose);
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}
