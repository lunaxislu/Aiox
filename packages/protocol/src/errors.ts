import type { GatewayError } from "./frames.js";

export class GatewayRemoteError extends Error {
  readonly code: string;
  readonly retryable: boolean | undefined;

  constructor(error: GatewayError) {
    super(error.message);
    this.name = "GatewayRemoteError";
    this.code = error.code;
    this.retryable = error.retryable;
  }
}

export class GatewayProtocolError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GatewayProtocolError";
  }
}

export class GatewayConnectionClosedError extends Error {
  readonly reason: unknown;

  constructor(reason?: unknown) {
    super("Gateway connection closed");
    this.name = "GatewayConnectionClosedError";
    this.reason = reason;
  }
}
