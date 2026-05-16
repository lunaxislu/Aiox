import { describe, expect, it } from "vitest";

import {
  agentInstanceStatuses,
  attachAgent,
  type AgentInstance,
} from "../../../src/core/agents.js";

describe("AgentInstance lifecycle", () => {
  it("defines the MVP attach statuses", () => {
    expect(agentInstanceStatuses).toEqual([
      "pending_attach",
      "connected",
      "disconnected",
      "stale",
    ]);
  });

  it("rejects a same-name attach when the existing agent is connected", () => {
    const existing: AgentInstance = {
      id: "agent-1",
      name: "impl",
      kind: "codex",
      status: "connected",
    };

    const result = attachAgent([existing], {
      id: "agent-2",
      name: "impl",
      kind: "codex",
    });

    expect(result).toEqual({
      ok: false,
      reason: "agent_name_already_connected",
      existing,
    });
  });

  it("allows same-name reconnect for disconnected and stale agents", () => {
    for (const status of ["disconnected", "stale"] as const) {
      const existing: AgentInstance = {
        id: `existing-${status}`,
        name: "impl",
        kind: "codex",
        status,
      };

      const result = attachAgent([existing], {
        id: `new-${status}`,
        name: "impl",
        kind: "codex",
      });

      expect(result).toEqual({
        ok: true,
        agent: {
          ...existing,
          status: "connected",
        },
      });
    }
  });

  it("transitions a same-name pending attach to connected using the same identity", () => {
    const existing: AgentInstance = {
      id: "desired-1",
      name: "impl",
      kind: "codex",
      status: "pending_attach",
    };

    const result = attachAgent([existing], {
      id: "agent-1",
      name: "impl",
      kind: "codex",
    });

    expect(result).toEqual({
      ok: true,
      agent: {
        ...existing,
        status: "connected",
      },
    });
  });
});
