import {
  activeExecutionDependencySchema,
  serverStopResultSchema,
  type ActiveExecutionDependency,
  type ServerStopResult,
} from "@aiox/protocol";
import type { GatewayState } from "./gateway-state.js";

export class ServerAdmissionClosedError extends Error {
  constructor() {
    super("Local Server is not admitting new operations or dependencies");
    this.name = "ServerAdmissionClosedError";
  }
}

export interface OperationAdmission {
  registerDependency(
    dependency: ActiveExecutionDependency,
  ): () => void;
}

export interface ShutdownCoordinator {
  admit<Result>(
    operation: (admission: OperationAdmission) => Promise<Result>,
  ): Promise<Result>;
  registerDependency(dependency: ActiveExecutionDependency): () => void;
  prepareStop(force: boolean): Promise<ServerStopResult>;
  completeStop(): void;
  failStop(): void;
}

function dependencyKey(dependency: ActiveExecutionDependency): string {
  return `${dependency.kind}:${dependency.id}`;
}

export function createShutdownCoordinator({
  gatewayState,
}: {
  gatewayState: GatewayState;
}): ShutdownCoordinator {
  const dependencies = new Map<
    string,
    { dependency: ActiveExecutionDependency; references: number }
  >();
  const operations = new Set<Promise<unknown>>();
  let activeStop: Promise<ServerStopResult> | undefined;

  function admissionOpen(): boolean {
    return gatewayState.snapshot().server.lifecycle === "running";
  }

  function register(
    dependencyInput: ActiveExecutionDependency,
  ): () => void {
    const dependency = activeExecutionDependencySchema.parse(dependencyInput);
    const key = dependencyKey(dependency);
    const existing = dependencies.get(key);
    dependencies.set(key, {
      dependency,
      references: (existing?.references ?? 0) + 1,
    });
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = dependencies.get(key);
      if (!current) return;
      if (current.references === 1) dependencies.delete(key);
      else dependencies.set(key, { ...current, references: current.references - 1 });
    };
  }

  return {
    admit(operation) {
      if (!admissionOpen()) throw new ServerAdmissionClosedError();
      let operationActive = true;
      const admission: OperationAdmission = {
        registerDependency(dependency) {
          if (!operationActive) throw new ServerAdmissionClosedError();
          return register(dependency);
        },
      };
      const pending = Promise.resolve().then(() => operation(admission));
      operations.add(pending);
      const settle = (): void => {
        operationActive = false;
        operations.delete(pending);
      };
      void pending.then(settle, settle);
      return pending;
    },
    registerDependency(dependency) {
      if (!admissionOpen()) throw new ServerAdmissionClosedError();
      return register(dependency);
    },
    prepareStop(force) {
      if (activeStop) return activeStop;
      if (!admissionOpen()) throw new ServerAdmissionClosedError();

      gatewayState.setServerLifecycle("quiescing");
      const preBarrierOperations = [...operations];
      const stop = (async (): Promise<ServerStopResult> => {
        await Promise.allSettled(preBarrierOperations);
        const blockers = [...dependencies.values()]
          .map(({ dependency }) => dependency)
          .sort((left, right) =>
          dependencyKey(left).localeCompare(dependencyKey(right)),
          );
        if (!force && blockers.length > 0) {
          const result = serverStopResultSchema.parse({
            accepted: false,
            force,
            blockers,
            residualRisk: false,
          });
          gatewayState.setServerLifecycle("running");
          activeStop = undefined;
          return result;
        }

        gatewayState.setServerLifecycle("stopping");
        return serverStopResultSchema.parse({
          accepted: true,
          force,
          blockers,
          residualRisk: force && blockers.length > 0,
        });
      })();
      activeStop = stop;
      return stop;
    },
    completeStop() {
      gatewayState.setServerLifecycle("stopped");
    },
    failStop() {
      gatewayState.setServerLifecycle("failed");
    },
  };
}
