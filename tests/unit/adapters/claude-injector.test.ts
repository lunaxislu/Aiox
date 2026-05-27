import { describe, expect, it, vi, afterEach } from "vitest";

import {
  injectClaudeChannel,
  type ClaudeChannelEndpointLookup,
} from "../../../src/adapters/claude/injector.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("injectClaudeChannel", () => {
  it("returns claude_channel_unavailable when agent has no registered runtime", async () => {
    const lookup = fakeLookup({});

    const result = await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_unavailable",
      message: expect.stringContaining("alpha"),
    });
  });

  it("returns success when endpoint returns 2xx", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 202 }));

    const result = await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "do the thing",
      chatId: "t1",
      origin: "codex",
    });

    expect(result).toEqual({ kind: "success" });
  });

  it("sends correct JSON body to the registered endpoint", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    const requests: { url: string; body: unknown }[] = [];

    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });

    await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "hello",
      chatId: "chat-1",
      origin: "codex",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://127.0.0.1:18789/send");
    expect(requests[0].body).toEqual({
      content: "hello",
      chat_id: "chat-1",
      origin: "codex",
    });
  });

  it("omits chat_id and origin when not provided", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    const requests: { body: unknown }[] = [];

    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      requests.push({ body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });

    await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "ping",
    });

    expect(requests[0].body).toEqual({ content: "ping" });
  });

  it("returns claude_channel_push_failed when endpoint returns non-2xx", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));

    const result = await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_push_failed",
      message: expect.stringContaining("500"),
    });
  });

  it("returns claude_channel_push_failed on AbortError (timeout)", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });

    vi.stubGlobal("fetch", async () => {
      const err = Object.assign(new Error("fetch aborted"), {
        name: "AbortError",
      });
      throw err;
    });

    const result = await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "hello",
      timeoutMs: 50,
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_push_failed",
      message: expect.stringContaining("fetch aborted"),
    });
  });

  it("returns claude_channel_unavailable on connection refused (non-abort fetch error)", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });

    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), {
        name: "Error",
      });
    });

    const result = await injectClaudeChannel(lookup, {
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_unavailable",
      message: expect.stringContaining("ECONNREFUSED"),
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeLookup(
  registry: Record<string, string>,
): ClaudeChannelEndpointLookup {
  return {
    getRuntime(agentName) {
      const endpoint = registry[agentName];
      return endpoint ? { endpoint } : undefined;
    },
  };
}
