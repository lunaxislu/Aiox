import { describe, expect, it } from "vitest";

import {
  buildInitializeRequest,
  buildLoadedThreadsRequest,
  buildTurnStartRequest,
  extractLoadedThreadIds,
  extractTurnId,
} from "./client.js";

describe("Codex app-server JSON-RPC helpers", () => {
  it("builds initialize requests", () => {
    expect(buildInitializeRequest(1)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        clientInfo: { name: "aiox-codex-app-server-poc", version: "0.0.1" },
        protocolVersion: "1",
        capabilities: {},
      },
    });
  });

  it("builds loaded thread list requests", () => {
    expect(buildLoadedThreadsRequest(2)).toEqual({
      jsonrpc: "2.0",
      id: 2,
      method: "thread/loaded/list",
      params: {},
    });
  });

  it("extracts loaded thread ids from app-server responses", () => {
    expect(extractLoadedThreadIds({ data: ["thread-a", "thread-b"] })).toEqual([
      "thread-a",
      "thread-b",
    ]);
  });

  it("builds turn/start requests for a specific thread id", () => {
    expect(buildTurnStartRequest(3, "thread-a", "hello")).toEqual({
      jsonrpc: "2.0",
      id: 3,
      method: "turn/start",
      params: {
        threadId: "thread-a",
        input: [{ type: "text", text: "hello" }],
      },
    });
  });

  it("extracts turn ids from both known response shapes", () => {
    expect(extractTurnId({ turn: { id: "turn-a" } })).toBe("turn-a");
    expect(extractTurnId({ turnId: "turn-b" })).toBe("turn-b");
  });
});
