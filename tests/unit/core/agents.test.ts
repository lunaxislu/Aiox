import { describe, expect, it } from "vitest";

import { agentInstanceStatuses } from "../../../src/core/agents.js";

describe("agent instance status", () => {
  it("narrows the attach status to a single connected literal (physical-delete redesign)", () => {
    expect(agentInstanceStatuses).toEqual(["connected"]);
  });
});
