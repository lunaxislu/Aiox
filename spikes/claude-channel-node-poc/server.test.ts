import { describe, expect, it } from "vitest";

import { toChannelNotification } from "./server.js";

describe("toChannelNotification", () => {
  it("builds a Claude channel notification from inbound content and metadata", () => {
    expect(
      toChannelNotification({
        content: "Say exactly: aiox channel received",
        chat_id: "test-001",
        origin: "codex",
      }),
    ).toEqual({
      method: "notifications/claude/channel",
      params: {
        content: "Say exactly: aiox channel received",
        meta: {
          chat_id: "test-001",
          origin: "codex",
        },
      },
    });
  });
});
