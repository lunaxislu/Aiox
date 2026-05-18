import { describe, expect, it } from "vitest";

import { createNoopSupervisor } from "../../../src/daemon/supervisor.js";

describe("noop daemon supervisor", () => {
  it("starts and stops idempotently", () => {
    const supervisor = createNoopSupervisor();

    expect(supervisor.state).toBe("idle");

    supervisor.start();
    supervisor.start();

    expect(supervisor.state).toBe("started");

    supervisor.stop();
    supervisor.stop();

    expect(supervisor.state).toBe("stopped");
  });
});
