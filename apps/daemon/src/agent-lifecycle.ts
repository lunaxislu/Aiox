import { createMachine } from "xstate";

/**
 * The single owner for an AgentController socket's execution lifecycle.
 * Parallel regions preserve the valid overlap between relay loss and a process
 * stop request without mirroring either state in local booleans.
 */
export const agentLifecycle = createMachine({
    id: "agentLifecycle",
    type: "parallel",
    states: {
        execution: {
            initial: "preparing",
            states: {
                preparing: {
                    on: {
                        PREPARED: "prepared",
                        FINISH: "endedBeforePrepared",
                        EXIT: "endedBeforePrepared",
                    },
                },
                prepared: {
                    on: {
                        STARTED: "started",
                        FINISH: "endedAfterPrepared",
                        EXIT: "endedAfterPrepared",
                    },
                },
                started: {
                    on: {
                        FINISH: "endedAfterStarted",
                        EXIT: "endedAfterStarted",
                    },
                },
                endedBeforePrepared: {
                    type: "final",
                },
                endedAfterPrepared: {
                    type: "final",
                },
                endedAfterStarted: {
                    type: "final",
                },
            },
        },
        relay: {
            initial: "connected",
            states: {
                connected: {
                    on: {
                        RELAY_DISCONNECTED: "disconnected",
                        FINISH: "done",
                    },
                },
                disconnected: {
                    on: { FINISH: "done" },
                },
                done: {
                    type: "final",
                },
            },
        },
        process: {
            initial: "active",
            states: {
                active: {
                    on: {
                        STOP_REQUESTED: "stopping",
                        FINISH: "done",
                    },
                },
                stopping: {
                    on: { FINISH: "done" },
                },
                done: {
                    type: "final",
                },
            },
        },
    },
    types: {
        events: {} as
            | { type: "PREPARED" }
            | { type: "STARTED" }
            | { type: "RELAY_DISCONNECTED" }
            | { type: "STOP_REQUESTED" }
            | { type: "FINISH" }
            | { type: "EXIT" },
    },
});
