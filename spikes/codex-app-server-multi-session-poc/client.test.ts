import { describe, expect, it } from "vitest";

import {
  buildInitializeRequest,
  buildInjectItemsRequest,
  buildLoadedThreadsRequest,
  buildMcpServerToolCallRequest,
  buildThreadReadRequest,
  buildThreadStartRequest,
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

  it("builds a request to create a thread", () => {
    expect(buildThreadStartRequest(3)).toEqual({
      jsonrpc: "2.0",
      id: 3,
      method: "thread/start",
      params: {},
    });
  });

  it("builds a request to read a thread with its turns", () => {
    expect(buildThreadReadRequest(4, "thread-a")).toEqual({
      jsonrpc: "2.0",
      id: 4,
      method: "thread/read",
      params: { threadId: "thread-a", includeTurns: true },
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

  it("builds a raw developer input-text injection for a loaded thread", () => {
    expect(buildInjectItemsRequest(4, "thread-a", '{"protocol":"aiox.message.v1"}')).toEqual({
      jsonrpc: "2.0",
      id: 4,
      method: "thread/inject_items",
      params: {
        threadId: "thread-a",
        items: [
          {
            type: "message",
            role: "developer",
            content: [{ type: "input_text", text: '{"protocol":"aiox.message.v1"}' }],
          },
        ],
      },
    });
  });

  it("builds a configured MCP tool call for a target thread", () => {
    expect(
      buildMcpServerToolCallRequest(5, "thread-a", "aiox-inbound", "deliver_message", {
        deliveryId: "delivery-1",
      }),
    ).toEqual({
      jsonrpc: "2.0",
      id: 5,
      method: "mcpServer/tool/call",
      params: {
        threadId: "thread-a",
        server: "aiox-inbound",
        tool: "deliver_message",
        arguments: { deliveryId: "delivery-1" },
      },
    });
  });

  it("extracts turn ids from both known response shapes", () => {
    expect(extractTurnId({ turn: { id: "turn-a" } })).toBe("turn-a");
    expect(extractTurnId({ turnId: "turn-b" })).toBe("turn-b");
  });
});
