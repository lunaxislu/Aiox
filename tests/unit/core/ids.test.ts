import { describe, expect, it } from "vitest";

import {
  createPrefixedIdFactory,
  createRandomPrefixedId,
  idPrefixes,
} from "../../../src/core/ids.js";

describe("core id generation", () => {
  it("defines stable MVP id prefixes", () => {
    expect(idPrefixes).toEqual({
      agent: "agent",
      pair: "pair",
      route: "route",
      message: "message",
      delivery: "delivery",
      event: "event",
    });
  });

  it("supports deterministic id factory injection for tests", () => {
    const createId = createPrefixedIdFactory(() => "fixed");

    expect(createId("agent")).toBe("agent_fixed");
    expect(createId("delivery")).toBe("delivery_fixed");
  });

  it("creates default prefixed ids", () => {
    expect(createRandomPrefixedId("event")).toMatch(/^event_[0-9a-f-]+$/);
  });
});
