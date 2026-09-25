import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import { agentLifecycle } from "./agent-lifecycle";

describe("agent lifecycle owner", () => {
    test("owns preparation and external start admission", () => {
        const actor = createActor(agentLifecycle).start();

        expect(actor.getSnapshot().matches({ execution: "preparing" })).toBe(
            true,
        );
        expect(actor.getSnapshot().can({ type: "STARTED" })).toBe(false);

        actor.send({ type: "PREPARED" });
        expect(actor.getSnapshot().matches({ execution: "prepared" })).toBe(
            true,
        );
        expect(actor.getSnapshot().can({ type: "STARTED" })).toBe(true);

        actor.send({ type: "STARTED" });
        expect(actor.getSnapshot().matches({ execution: "started" })).toBe(
            true,
        );
        expect(actor.getSnapshot().can({ type: "STARTED" })).toBe(false);
        actor.stop();
    });

    test("keeps relay loss and stop request as independent owned dimensions", () => {
        const actor = createActor(agentLifecycle).start();
        actor.send({ type: "PREPARED" });
        actor.send({ type: "STARTED" });
        actor.send({ type: "RELAY_DISCONNECTED" });
        actor.send({ type: "STOP_REQUESTED" });

        expect(actor.getSnapshot().matches({ relay: "disconnected" })).toBe(
            true,
        );
        expect(actor.getSnapshot().matches({ process: "stopping" })).toBe(true);
        expect(actor.getSnapshot().matches({ execution: "started" })).toBe(
            true,
        );
        actor.stop();
    });

    test("terminal finish owns the end transition", () => {
        const actor = createActor(agentLifecycle).start();
        actor.send({ type: "FINISH" });

        expect(
            actor.getSnapshot().matches({ execution: "endedBeforePrepared" }),
        ).toBe(true);
        expect(actor.getSnapshot().can({ type: "PREPARED" })).toBe(false);
        expect(actor.getSnapshot().status).toBe("done");
        actor.stop();
    });

    test("retains whether preparation completed after process exit", () => {
        const actor = createActor(agentLifecycle).start();
        actor.send({ type: "PREPARED" });
        actor.send({ type: "EXIT" });

        expect(
            actor.getSnapshot().matches({ execution: "endedAfterPrepared" }),
        ).toBe(true);
        actor.stop();
    });
});
