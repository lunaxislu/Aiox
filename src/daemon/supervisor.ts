export interface Supervisor {
  start(): void;
  stop(): void;
}

export function createNoopSupervisor(): Supervisor {
  return {
    start() {},
    stop() {},
  };
}
