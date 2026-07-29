import { describe, expect, it } from "vitest";

import { buildInboundDeliveryResult } from "./inbound-fixture.js";

describe("aiox inbound delivery MCP fixture", () => {
  it("returns a successful tool result containing the supplied delivery marker", () => {
    expect(
      buildInboundDeliveryResult({
        deliveryId: "delivery-1",
        marker: "AIOX_MCP_PRESENTATION_MARKER",
      }),
    ).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            deliveryId: "delivery-1",
            marker: "AIOX_MCP_PRESENTATION_MARKER",
          }),
        },
      ],
      structuredContent: {
        deliveryId: "delivery-1",
        marker: "AIOX_MCP_PRESENTATION_MARKER",
      },
    });
  });
});
