export type SupervisorState = "idle" | "started" | "stopped";

export interface Supervisor {
  readonly state: SupervisorState;
  start(): void;
  stop(): void;
}

export function createNoopSupervisor(): Supervisor {
  let state: SupervisorState = "idle";

  return {
    get state() {
      return state;
    },
    start() {
      state = "started";
    },
    stop() {
      state = "stopped";
    },
  };
}
