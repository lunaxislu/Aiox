import type {
  GatewayTransportHandlers,
  ReconnectGatewayTransport,
} from "@aiox/protocol";

export function browserControlWebSocketUrl(
  location: Pick<Location, "host" | "protocol"> = window.location,
): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/control`;
}

export async function connectBrowserControlWebSocket(
  createSocket: (url: string) => WebSocket = (url) => new WebSocket(url),
): Promise<ReconnectGatewayTransport> {
  const socket = createSocket(browserControlWebSocketUrl());
  await new Promise<void>((resolve, reject) => {
    const open = (): void => {
      socket.removeEventListener("error", error);
      resolve();
    };
    const error = (): void => {
      socket.removeEventListener("open", open);
      reject(new Error("Control WebSocket failed to open"));
    };
    socket.addEventListener("open", open, { once: true });
    socket.addEventListener("error", error, { once: true });
  });

  return {
    send: (data) => socket.send(data),
    subscribe(handlers: GatewayTransportHandlers) {
      let reportedClose = false;
      const closeOnce = (reason: unknown): void => {
        if (reportedClose) return;
        reportedClose = true;
        handlers.close(reason);
      };
      const message = (event: MessageEvent<unknown>): void => {
        if (typeof event.data !== "string") {
          closeOnce(new Error("Control WebSocket delivered non-text data"));
          socket.close(1003, "TEXT_REQUIRED");
          return;
        }
        handlers.message(event.data);
      };
      const close = (event: CloseEvent): void =>
        closeOnce({ code: event.code, reason: event.reason });
      const error = (): void =>
        closeOnce(new Error("Control WebSocket transport failed"));
      socket.addEventListener("message", message);
      socket.addEventListener("close", close);
      socket.addEventListener("error", error);
      return () => {
        socket.removeEventListener("message", message);
        socket.removeEventListener("close", close);
        socket.removeEventListener("error", error);
      };
    },
    close() {
      if (socket.readyState === WebSocket.OPEN) socket.close();
    },
  };
}
