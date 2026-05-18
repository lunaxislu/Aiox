import { describe, expect, it } from "vitest";

import { createNoopSupervisor } from "../../../src/daemon/supervisor.js";

describe("noop daemon supervisor", () => {
  it("starts and stops idempotently", () => {
    const supervisor = createNoopSupervisor();

    supervisor.start();
    supervisor.start();

    supervisor.stop();
    supervisor.stop();

    expect(supervisor).not.toHaveProperty("state");
  });
});
