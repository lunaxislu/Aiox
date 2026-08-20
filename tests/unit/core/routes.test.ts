import { describe, expect, it } from "vitest";

import { createDirectedRoutes } from "../../../src/core/routes.js";

describe("Directed routes", () => {
  it("creates one active directed route per target", () => {
    const result = createDirectedRoutes({
      sourceAgentId: "source-1",
      targetAgentIds: ["target-1", "target-2"],
    });

    expect(result).toEqual([
      {
        sourceAgentId: "source-1",
        targetAgentId: "target-1",
        status: "active",
      },
      {
        sourceAgentId: "source-1",
        targetAgentId: "target-2",
        status: "active",
      },
    ]);
  });

});
