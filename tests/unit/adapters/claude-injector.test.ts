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
      agentId: "alpha",
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
      agentId: "alpha",
      agentName: "alpha",
      content: "do the thing",
    });

    expect(result).toEqual({ kind: "success" });
  });

  it("sends only the canonical envelope to the registered endpoint", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    const requests: { url: string; body: unknown }[] = [];

    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });

    await injectClaudeChannel(lookup, {
      agentId: "alpha",
      agentName: "alpha",
      content: "hello",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://127.0.0.1:18789/send");
    expect(requests[0].body).toEqual({ content: "hello" });
  });

  it("returns claude_channel_push_failed when endpoint returns non-2xx", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));

    const result = await injectClaudeChannel(lookup, {
      agentId: "alpha",
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_push_failed",
      message: expect.stringContaining("500"),
    });
  });

  it("returns claude_channel_push_unconfirmed on AbortError (timeout)", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });

    vi.stubGlobal("fetch", async () => {
      const err = Object.assign(new Error("fetch aborted"), {
        name: "AbortError",
      });
      throw err;
    });

    const result = await injectClaudeChannel(lookup, {
      agentId: "alpha",
      agentName: "alpha",
      content: "hello",
      timeoutMs: 50,
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_push_unconfirmed",
      message: expect.stringContaining("fetch aborted"),
    });
  });

  it("returns claude_channel_unavailable on a positively identified connection refusal", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });

    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), {
        name: "Error",
        code: "ECONNREFUSED",
      });
    });

    const result = await injectClaudeChannel(lookup, {
      agentId: "alpha",
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_unavailable",
      message: expect.stringContaining("ECONNREFUSED"),
    });
  });

  it("returns claude_channel_push_unconfirmed on an ambiguous non-abort fetch error", async () => {
    const lookup = fakeLookup({ alpha: "http://127.0.0.1:18789/send" });

    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("socket closed"), { name: "Error" });
    });

    const result = await injectClaudeChannel(lookup, {
      agentId: "alpha",
      agentName: "alpha",
      content: "hello",
    });

    expect(result).toMatchObject({
      kind: "failed",
      reason: "claude_channel_push_unconfirmed",
      message: expect.stringContaining("socket closed"),
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
    getRuntime(agentId) {
      const endpoint = registry[agentId];
      return endpoint ? { endpoint } : undefined;
    },
  };
}
