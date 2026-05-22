import { describe, expect, it } from "vitest";

import {
  createDaemonState,
  createPendingAttach,
  parseLoopbackHttpEndpoint,
  registerChannel,
} from "../../../spikes/claude-channel-registration-poc/daemon.js";

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
