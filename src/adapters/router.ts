import type {
  AdapterInjectDeferredReason,
  AdapterInjectFailureReason,
  AdapterInjectResult,
  AdapterOutgoingMessage,
  AgentAdapter,
} from "./contract.js";
import type { AgentDto, DaemonApi, DeliveryDto, SendMessageResponse } from "../daemon/api.js";

export interface CreateAdapterRouterOptions {
  api: DaemonApi;
  adapters: readonly AgentAdapter[];
}

export type AdapterDeliveryDispatchResult =
  | {
      deliveryId: string;
      targetAgentName: string;
      ok: true;
    }
  | {
      deliveryId: string;
      targetAgentName: string;
      ok: false;
      reason: AdapterInjectFailureReason | "adapter_not_found" | "target_agent_not_found";
      message: string;
    }
  | {
      deliveryId: string;
      targetAgentName: string;
      kind: "deferred";
      reason: AdapterInjectDeferredReason;
      eligibility?: string;
    };

export type AdapterDispatchResult =
  | {
      ok: true;
      deliveries: AdapterDeliveryDispatchResult[];
    }
  | Exclude<SendMessageResponse, { ok: true }>;

export interface AdapterRouter {
  dispatchOutgoing(message: AdapterOutgoingMessage): Promise<AdapterDispatchResult>;
}

export function createAdapterRouter(
  options: CreateAdapterRouterOptions,
): AdapterRouter {
  const adapters = new Map(options.adapters.map((adapter) => [adapter.kind, adapter]));

  return {
    async dispatchOutgoing(outgoing) {
      const fanout = options.api.sendMessage(outgoing);

      if (!fanout.ok) {
        return fanout;
      }

      const status = options.api.status();
      const results: AdapterDeliveryDispatchResult[] = [];

      for (const delivery of fanout.deliveries) {
        const targetAgent = status.agents.find(
          (agent) => agent.id === delivery.targetAgentId,
        );

        if (!targetAgent) {
          options.api.updateDeliveryStatus({
            deliveryId: delivery.id,
            status: "failed",
            error: {
              reason: "target_agent_not_found",
              message: `target agent ${delivery.targetAgentId} was not found`,
            },
          });
          results.push({
            deliveryId: delivery.id,
            targetAgentName: delivery.targetAgentId,
            ok: false,
            reason: "target_agent_not_found",
            message: `target agent ${delivery.targetAgentId} was not found`,
          });
          continue;
        }

        const adapter = adapters.get(targetAgent.kind);

        if (!adapter) {
          results.push({
            deliveryId: delivery.id,
            targetAgentName: targetAgent.name,
            kind: "deferred",
            reason: "target_adapter_not_registered",
          });
          continue;
        }

        options.api.updateDeliveryStatus({
          deliveryId: delivery.id,
          status: "delivering",
        });

        const injectResult = await adapter.inject({
          message: fanout.message,
          delivery,
          targetAgent,
        });

        results.push(
          injectResult.kind === "success"
            ? completeDelivery(options.api, delivery, targetAgent)
            : failDelivery(options.api, delivery, targetAgent, injectResult),
        );
      }

      return {
        ok: true,
        deliveries: results,
      };
    },
  };
}

function completeDelivery(
  api: DaemonApi,
  delivery: DeliveryDto,
  targetAgent: AgentDto,
): AdapterDeliveryDispatchResult {
  api.updateDeliveryStatus({ deliveryId: delivery.id, status: "delivered" });
  api.updateDeliveryStatus({ deliveryId: delivery.id, status: "completed" });

  return {
    deliveryId: delivery.id,
    targetAgentName: targetAgent.name,
    ok: true,
  };
}

function failDelivery(
  api: DaemonApi,
  delivery: DeliveryDto,
  targetAgent: AgentDto,
  result: Exclude<AdapterInjectResult, { kind: "success" }>,
): AdapterDeliveryDispatchResult {
  if (isDeferredInjectResult(result)) {
    api.updateDeliveryStatus({ deliveryId: delivery.id, status: "queued" });
    return {
      deliveryId: delivery.id,
      targetAgentName: targetAgent.name,
      kind: "deferred",
      reason: result.reason,
      ...(result.eligibility ? { eligibility: result.eligibility } : {}),
    };
  }

  api.updateDeliveryStatus({
    deliveryId: delivery.id,
    status: "failed",
    error: {
      reason: result.reason,
      message: result.message,
    },
  });

  return {
    deliveryId: delivery.id,
    targetAgentName: targetAgent.name,
    ok: false,
    reason: result.reason,
    message: result.message,
  };
}

function isDeferredInjectResult(
  result: Exclude<AdapterInjectResult, { kind: "success" }>,
): result is Extract<AdapterInjectResult, { kind: "deferred" }> {
  return result.kind === "deferred";
}
