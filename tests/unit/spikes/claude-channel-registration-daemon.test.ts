import { describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { McpServer } from "@modelcontextprotocol/server";

import {
  createDaemonState,
  createPendingAttach,
  parseLoopbackHttpEndpoint,
  registerChannel,
} from "../../../spikes/claude-channel-registration-poc/daemon.js";
import {
  createReplyStore,
  recordReply,
  startHttpIngress,
} from "../../../spikes/claude-channel-registration-poc/server.js";

describe("registerChannel", () => {
  it("moves pending → registry and stores endpoint on success", () => {
    const state = createDaemonState();
    const pending = createPendingAttach(state, "alpha");
    expect(state.pending.has("alpha")).toBe(true);

    const result = registerChannel(
      state,
      "alpha",
      pending.token,
      "http://127.0.0.1:18789/send",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.channel.agentName).toBe("alpha");
    expect(result.channel.endpoint).toBe("http://127.0.0.1:18789/send");
    expect(state.pending.has("alpha")).toBe(false);
    expect(state.registry.get("alpha")).toEqual(result.channel);
  });

  it("rejects when no pending attach exists for the agent", () => {
    const state = createDaemonState();

    const result = registerChannel(
      state,
      "bravo",
      "no-pending-token",
      "http://127.0.0.1:18789/send",
    );

    expect(result).toEqual({
      ok: false,
      reason: "registration_unknown_token",
    });
    expect(state.registry.size).toBe(0);
  });

  it("rejects token mismatch and preserves pending entry", () => {
    const state = createDaemonState();
    const pending = createPendingAttach(state, "alpha");

    const result = registerChannel(
      state,
      "alpha",
      "wrong-token",
      "http://127.0.0.1:18789/send",
    );

    expect(result).toEqual({
      ok: false,
      reason: "registration_unknown_token",
    });
    expect(state.pending.get("alpha")?.token).toBe(pending.token);
    expect(state.registry.size).toBe(0);
  });
});

describe("parseLoopbackHttpEndpoint", () => {
  it.each([
    ["http://127.0.0.1:18789/send", "http://127.0.0.1:18789/send"],
    ["http://localhost:1234/send", "http://localhost:1234/send"],
    ["http://LOCALHOST:1234/send", "http://localhost:1234/send"],
  ])("accepts %s as canonical %s", (input, expected) => {
    expect(parseLoopbackHttpEndpoint(input)).toBe(expected);
  });

  it.each([
    ["not-a-url"],
    ["https://127.0.0.1:18789/send"],
    ["http://127.0.0.1/send"],
    ["http://example.com:18789/send"],
    ["http://127.0.0.1:18789/"],
    ["http://127.0.0.1:18789/other"],
    ["http://127.0.0.1:18789"],
  ])("rejects %s", (input) => {
    expect(parseLoopbackHttpEndpoint(input)).toBeNull();
  });
});

describe("reply observation store", () => {
  it("records reply tool calls for later inspection", () => {
    const store = createReplyStore();

    const reply = recordReply(store, {
      chat_id: "test-001",
      text: "aiox channel received",
    });

    expect(reply.chat_id).toBe("test-001");
    expect(reply.text).toBe("aiox channel received");
    expect(reply.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(store.replies).toEqual([reply]);
  });

  it("exposes recorded replies through the spike HTTP ingress", async () => {
    const store = createReplyStore();
    recordReply(store, {
      chat_id: "test-001",
      text: "aiox channel received",
    });
    const fakeMcp = {
      server: {
        notification: async () => {},
      },
    } as unknown as McpServer;
    const server = await startHttpIngress(fakeMcp, {
      port: 0,
      hangMs: 0,
      replyStore: store,
    });
    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(
        `http://127.0.0.1:${address.port}/replies`,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual([
        expect.objectContaining({
          chat_id: "test-001",
          text: "aiox channel received",
        }),
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});
