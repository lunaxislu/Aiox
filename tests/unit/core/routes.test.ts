import { describe, expect, it } from "vitest";

import {
  createDirectedRoutes,
  disconnectDirectedRoutes,
  type Route,
} from "../../../src/core/routes.js";

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

  it("disconnects only the specified directed routes", () => {
    const routes: Route[] = [
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
      {
        sourceAgentId: "target-1",
        targetAgentId: "source-1",
        status: "active",
      },
    ];

    const result = disconnectDirectedRoutes(routes, {
      sourceAgentId: "source-1",
      targetAgentIds: ["target-1"],
    });

    expect(result).toEqual([
      {
        sourceAgentId: "source-1",
        targetAgentId: "target-2",
        status: "active",
      },
      {
        sourceAgentId: "target-1",
        targetAgentId: "source-1",
        status: "active",
      },
    ]);
  });
});
