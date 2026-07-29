import { describe, expect, it } from "vitest";

import {
  createPublicDeliveryId,
  createPublicMessageId,
} from "../../../src/core/public-ids.js";

describe("public ID factory", () => {
  it("issues distinct opaque values with static public-type prefixes", () => {
    const messageId = createPublicMessageId();
    const secondMessageId = createPublicMessageId();
    const deliveryId = createPublicDeliveryId();

    expect(messageId).toMatch(/^message_/);
    expect(deliveryId).toMatch(/^delivery_/);
    expect(secondMessageId).not.toBe(messageId);
    expect(deliveryId).not.toBe(messageId);
  });

  it("does not take agent, profile, or thread values as issuance input", () => {
    expect(createPublicMessageId).toHaveLength(0);
    expect(createPublicDeliveryId).toHaveLength(0);
  });
});
