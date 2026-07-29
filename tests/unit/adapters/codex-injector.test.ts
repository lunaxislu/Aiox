import { describe, expect, it } from "vitest";

import {
  injectTurnStart,
  type CodexTurnStartRuntime,
} from "../../../src/adapters/codex/injector.js";

describe("Codex turn/start injector", () => {
  it("rejects ack when the requested thread id does not match the runtime active thread", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-active",
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-other",
        input: "hello",
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "codex_binding_uncertain",
      message: expect.stringContaining("thread-other"),
    });
    expect(runtime.requests).toEqual([]);
  });

  it("returns a typed timeout failure when turn/start ack times out", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      rejectWith: Object.assign(new Error("ack timed out"), {
        code: "codex_turn_start_timeout",
      }),
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
        timeoutMs: 5,
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "codex_turn_start_timeout",
      message: "ack timed out",
    });
  });

  it("forwards a same-request late success to its delivery observer after timeout", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      rejectWith: Object.assign(new Error("ack timed out"), {
        code: "codex_turn_start_timeout",
      }),
    });
    const lateResults: unknown[] = [];

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
        onLateResponse: (result) => lateResults.push(result),
      }),
    ).resolves.toMatchObject({ kind: "failed", reason: "codex_turn_start_timeout" });

    const request = runtime.requests[0] as {
      options: { onLateResponse(response: unknown): void };
    };
    request.options.onLateResponse({ id: 7, result: { accepted: true } });

    expect(lateResults).toEqual([{ kind: "success" }]);
  });

  it("forwards a same-request late JSON-RPC rejection with its code to the delivery observer", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      rejectWith: Object.assign(new Error("ack timed out"), {
        code: "codex_turn_start_timeout",
      }),
    });
    const lateResults: unknown[] = [];

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
        onLateResponse: (result) => lateResults.push(result),
      }),
    ).resolves.toMatchObject({ kind: "failed", reason: "codex_turn_start_timeout" });

    const request = runtime.requests[0] as {
      options: { onLateResponse(response: unknown): void };
    };
    request.options.onLateResponse({
      id: 7,
      error: { code: -32043, message: "application rejected turn" },
    });

    expect(lateResults).toEqual([
      {
        kind: "failed",
        reason: "codex_jsonrpc_error",
        message: "application rejected turn",
        jsonRpcCode: -32043,
        requestId: 7,
      },
    ]);
  });

  it("returns a typed ws_dropped failure when the app-server socket drops", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      rejectWith: Object.assign(new Error("socket dropped"), {
        code: "codex_app_server_ws_dropped",
      }),
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "codex_app_server_ws_dropped",
      message: "socket dropped",
    });
  });

  it("returns binding uncertain when the active thread changes before ack validation", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      resolveWith: {
        turn: {
          id: "turn-1",
          status: "inProgress",
        },
      },
      activeThreadIdAfterRequest: "thread-2",
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "codex_binding_uncertain",
      message: expect.stringContaining("thread-2"),
    });
  });

  it("passes through typed binding uncertain failures from the websocket layer", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      rejectWith: Object.assign(new Error("binding mismatch"), {
        code: "codex_binding_uncertain",
      }),
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "codex_binding_uncertain",
      message: "binding mismatch",
    });
  });

  it("returns success when turn/start is acknowledged for the active thread", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      resolveWith: {
        turn: {
          id: "turn-1",
          status: "inProgress",
        },
      },
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: "hello",
      }),
    ).resolves.toEqual({ kind: "success" });
    expect(runtime.requests).toEqual([
      {
        method: "turn/start",
        params: {
          threadId: "thread-1",
          input: [{ type: "text", text: "hello" }],
        },
        options: {
          timeoutMs: undefined,
          timeoutErrorCode: "codex_turn_start_timeout",
        },
      },
    ]);
  });

  it("starts a canonical envelope as turn/start user input", async () => {
    const runtime = fakeRuntime({
      activeThreadId: "thread-1",
      resolveWith: {},
    });

    await expect(
      injectTurnStart(runtime, {
        threadId: "thread-1",
        input: '{"protocol":"aiox.message.v1","deliveryId":"delivery-1"}',
      }),
    ).resolves.toEqual({ kind: "success" });

    expect(runtime.requests).toMatchObject([
      {
        method: "turn/start",
        params: {
          threadId: "thread-1",
          input: [
            {
              type: "text",
              text: '{"protocol":"aiox.message.v1","deliveryId":"delivery-1"}',
            },
          ],
        },
      },
    ]);
  });

  function fakeRuntime(options: {
    activeThreadId: string | null;
    resolveWith?: unknown;
    rejectWith?: Error;
    activeThreadIdAfterRequest?: string | null;
  }): CodexTurnStartRuntime & {
    requests: Array<{
      method: string;
      params: unknown;
      options: unknown;
    }>;
  } {
    const requests: Array<{
      method: string;
      params: unknown;
      options: unknown;
    }> = [];

    return {
      get activeThreadId() {
        return options.activeThreadId;
      },
      requests,
      requestCodex(method, params, requestOptions) {
        requests.push({ method, params, options: requestOptions });

        if (options.rejectWith) {
          return Promise.reject(options.rejectWith);
        }

        if ("activeThreadIdAfterRequest" in options) {
          options.activeThreadId = options.activeThreadIdAfterRequest ?? null;
        }

        return Promise.resolve(options.resolveWith);
      },
    };
  }
});
