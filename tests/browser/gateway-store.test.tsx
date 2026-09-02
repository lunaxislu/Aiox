// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { App } from "../../apps/web/src/app.js";
import { browserControlWebSocketUrl } from "../../apps/web/src/browser-transport.js";
import { consumeSessionCredential } from "../../apps/web/src/credential.js";
import {
  createGatewayStore,
  type GatewayStore,
} from "../../apps/web/src/gateway-store.js";
import type {
  GatewayTransportHandlers,
  ReconnectGatewayTransport,
} from "../../packages/protocol/src/index.js";

const credential = "d".repeat(43);

class BrowserScriptTransport implements ReconnectGatewayTransport {
  handlers: GatewayTransportHandlers | undefined;
  stopRequest:
    | { id: string; force: boolean; resolve: (payload: unknown) => void }
    | undefined;

  constructor(
    readonly snapshot: {
      server: {
        epoch: string;
        lifecycle: "running" | "stopped";
      };
      stateVersion: number;
      nextEventSeq: number;
    },
  ) {}

  send(data: string): void {
    const request = JSON.parse(data) as {
      id: string;
      method: string;
      params?: { force?: boolean };
    };
    if (request.method === "gateway.subscribe") {
      this.respond(request.id, this.snapshot);
      return;
    }
    if (request.method === "server.stop") {
      this.stopRequest = {
        id: request.id,
        force: request.params?.force === true,
        resolve: (payload) => this.respond(request.id, payload),
      };
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

  event(
    seq: number,
    stateVersion: number,
    lifecycle: "running" | "quiescing",
  ): void {
    this.handlers?.message(
      JSON.stringify({
        type: "event",
        event: "server.lifecycle.changed",
        payload: {
          serverEpoch: this.snapshot.server.epoch,
          data: { lifecycle },
        },
        seq,
        stateVersion,
      }),
    );
  }

  close(): void {
    this.handlers?.close("client-close");
  }
}

describe("browser GatewayStore", () => {
  it("consumes the session fragment into memory and immediately erases it", () => {
    history.replaceState(
      { existing: true },
      "",
      `/?view=control#session=${credential}`,
    );

    expect(consumeSessionCredential()).toBe(credential);
    expect(location.pathname + location.search + location.hash).toBe(
      "/?view=control",
    );
    expect(history.state).toEqual({ existing: true });
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);

    history.replaceState(null, "", "/#session=invalid");
    expect(() => consumeSessionCredential()).toThrow(/missing or invalid/);
    expect(location.hash).toBe("");
    expect(
      browserControlWebSocketUrl({ protocol: "http:", host: "127.0.0.1:4321" }),
    ).toBe("ws://127.0.0.1:4321/ws/control");
  });

  it("keeps request pending separate from lifecycle and resnapshots after a gap", async () => {
    const first = new BrowserScriptTransport({
      server: { epoch: "epoch-web", lifecycle: "running" },
      stateVersion: 1,
      nextEventSeq: 1,
    });
    const second = new BrowserScriptTransport({
      server: { epoch: "epoch-web", lifecycle: "stopped" },
      stateVersion: 8,
      nextEventSeq: 8,
    });
    const transports = [first, second];
    const store = createGatewayStore({
      credential,
      createRequestId: (() => {
        let id = 0;
        return () => `web-${id++}`;
      })(),
      connect: async () => {
        const transport = transports.shift();
        if (!transport) throw new Error("unexpected reconnect");
        return transport;
      },
      waitBeforeReconnect: async () => {},
    });

    await store.start();
    expect(store.getState()).toMatchObject({
      connection: "connected",
      snapshot: { server: { lifecycle: "running" }, stateVersion: 1 },
      stopPending: false,
    });

    const stop = store.requestServerStop(false);
    expect(store.getState()).toMatchObject({
      stopPending: true,
      snapshot: { server: { lifecycle: "running" } },
    });
    first.stopRequest?.resolve({
      accepted: false,
      force: false,
      blockers: [{ kind: "agent", id: "agent-live" }],
      residualRisk: false,
    });
    await stop;
    expect(store.getState()).toMatchObject({
      stopPending: false,
      snapshot: { server: { lifecycle: "running" } },
    });

    first.event(1, 2, "quiescing");
    expect(store.getState().snapshot?.server.lifecycle).toBe("quiescing");
    first.event(3, 4, "running");
    await vi.waitFor(() =>
      expect(store.getState()).toMatchObject({
        connection: "connected",
        snapshot: { server: { lifecycle: "stopped" }, stateVersion: 8 },
      }),
    );
    store.dispose();
  });

  it("renders an explicit reconnecting shell state", async () => {
    const state = {
      connection: "reconnecting" as const,
      snapshot: {
        server: { epoch: "epoch-ui", lifecycle: "running" as const },
        stateVersion: 4,
        nextEventSeq: 4,
      },
      stopPending: false,
    };
    const store: GatewayStore = {
      getState: () => state,
      subscribe: () => () => {},
      start: async () => {},
      dispose: () => {},
      requestServerStop: async () => ({
        accepted: false,
        force: false,
        blockers: [],
        residualRisk: false,
      }),
    };
    const container = document.createElement("div");
    document.body.append(container);

    await act(async () => {
      createRoot(container).render(<App store={store} />);
    });

    expect(container.textContent).toMatch(/Reconnecting/i);
    expect(container.querySelector('[data-connection="reconnecting"]')).not.toBeNull();
    expect(container.textContent).toContain("running");
    expect(
      [...container.querySelectorAll("button")].every((button) => button.disabled),
    ).toBe(true);
  });
});
