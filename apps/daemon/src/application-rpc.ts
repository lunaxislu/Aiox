import { createHash } from "node:crypto";

import { ConfigConflictError, ConfigError, HostInputError } from "@aiox/config";
import { HostStateError } from "@aiox/persistence";
import {
    ApplicationRpc,
    type ApplicationFault,
    type HostCommand,
} from "@aiox/protocol";
import { Effect, Fiber, Stream } from "effect";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as RpcServer from "effect/unstable/rpc/RpcServer";

import { admitHostAgents, updateHostRoutes } from "./host-agents";
import type { AdmittedHostCommand } from "./host-command";
import { admitHostControl } from "./host-control";
import { admitHostRun } from "./host-run";
import { HttpError } from "./http-error";
import type { DaemonServices } from "./services";
import { resolveHostInput } from "./state-api";
import { applyWebCommand } from "./web-commands";

const fault = (error: unknown): ApplicationFault => {
    if (error instanceof HostInputError)
        return {
            code:
                error.stage === "yaml"
                    ? "invalid_yaml"
                    : error.stage === "config"
                      ? "invalid_config"
                      : "invalid_request",
            message: error.message,
            stage: error.stage,
        };
    if (error instanceof HostStateError)
        return { code: error.code, message: error.message, stage: "storage" };
    if (error instanceof ConfigConflictError)
        return {
            code: "config_conflict",
            message: error.message,
            details: { current: error.current },
        };
    if (error instanceof ConfigError)
        return {
            code: "invalid_config",
            message: error.message,
            stage: "config",
        };
    const value =
        typeof error === "object" && error !== null
            ? (error as Record<string, unknown>)
            : {};
    const details =
        error instanceof HttpError
            ? error.extra
            : typeof value.details === "object" && value.details !== null
              ? (value.details as Record<string, unknown>)
              : {};
    const checkpoint = details.checkpoint ?? value.checkpoint;
    const stage = details.stage ?? value.stage;
    return {
        code: typeof value.code === "string" ? value.code : "execution_failed",
        message:
            typeof value.message === "string" ? value.message : String(error),
        ...(typeof checkpoint === "number" ? { checkpoint } : {}),
        ...(typeof stage === "string" ? { stage } : {}),
        ...(Object.keys(details).length ? { details } : {}),
    };
};
const attempt = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({ try: run, catch: (error) => error });
const hash = (parts: unknown[]) =>
    createHash("sha256").update(JSON.stringify(parts)).digest("hex");

export function applicationHandlers(services: DaemonServices) {
    const host = (
        clientSessionId: string,
        command: HostCommand,
        input: { requestId: string },
        parts: unknown[],
        admit: () => Promise<AdmittedHostCommand>,
    ) =>
        Stream.unwrap(
            services.sequencer.resume(clientSessionId).pipe(
                Effect.andThen(() =>
                    services.hostCommands.stream(
                        {
                            requestId: input.requestId,
                            command,
                            hash: hash(parts),
                        },
                        admit,
                    ),
                ),
                Effect.mapError(fault),
            ),
        );
    return ApplicationRpc.toLayer({
        "host.resolve": ({ clientSessionId, input }) =>
            services.sequencer.resume(clientSessionId).pipe(
                Effect.andThen(() =>
                    attempt(() => resolveHostInput(services, input)),
                ),
                Effect.mapError(fault),
            ),
        "config.read": ({ clientSessionId }) =>
            services.sequencer.resume(clientSessionId).pipe(
                Effect.andThen(() =>
                    attempt(() => services.configDocument.read()),
                ),
                Effect.mapError(fault),
            ),
        "config.write": ({ clientSessionId, input }) =>
            services.sequencer.resume(clientSessionId).pipe(
                Effect.andThen(() =>
                    attempt(() => services.configDocument.write(input)),
                ),
                Effect.mapError(fault),
            ),
        "host.run": ({ clientSessionId, input }) =>
            host(
                clientSessionId,
                "host.run",
                input,
                ["/api/hosts/run", input],
                () => admitHostRun(services, input, false),
            ),
        "host.restart": ({ clientSessionId, input }) =>
            host(
                clientSessionId,
                "host.restart",
                input,
                ["/api/hosts/restart", input],
                () => admitHostRun(services, input, true),
            ),
        "host.stop": ({ clientSessionId, input, hostId }) =>
            host(
                clientSessionId,
                "host.stop",
                input,
                ["POST", `/api/hosts/${hostId}/stop`, input],
                () => admitHostControl(services, input, false, hostId),
            ),
        "host.delete": ({ clientSessionId, input, hostId }) =>
            host(
                clientSessionId,
                "host.delete",
                input,
                ["DELETE", `/api/hosts/${hostId}`, input],
                () => admitHostControl(services, input, true, hostId),
            ),
        "host.agent.start": ({ clientSessionId, input }) =>
            host(
                clientSessionId,
                "host.agent.start",
                input,
                ["/api/hosts/agents/start", input],
                () => admitHostAgents(services, input, "start"),
            ),
        "host.agent.restart": ({ clientSessionId, input }) =>
            host(
                clientSessionId,
                "host.agent.restart",
                input,
                ["/api/hosts/agents/restart", input],
                () => admitHostAgents(services, input, "restart"),
            ),
        "host.agent.stop": ({ clientSessionId, input, hostId }) =>
            host(
                clientSessionId,
                "host.agent.stop",
                input,
                [`/api/hosts/${hostId}/agents/stop`, input],
                () => admitHostAgents(services, input, "stop", hostId),
            ),
        "host.network.route": ({
            clientSessionId,
            hostId,
            networkId,
            operation,
        }) =>
            services.sequencer.resume(clientSessionId).pipe(
                Effect.andThen(() =>
                    attempt(() =>
                        updateHostRoutes(
                            services,
                            hostId,
                            networkId,
                            operation,
                        ),
                    ),
                ),
                Effect.mapError(fault),
            ),

        "session.open": () =>
            services.sequencer.open.pipe(
                Effect.map((session) => ({
                    ...session,
                    epoch: services.appState.epoch,
                })),
                Effect.mapError(fault),
            ),
        "session.resume": ({ clientSessionId }) =>
            services.sequencer.resume(clientSessionId).pipe(
                Effect.map((session) => ({
                    ...session,
                    epoch: services.appState.epoch,
                })),
                Effect.mapError(fault),
            ),
        "state.subscribe": ({ clientSessionId }) =>
            Stream.unwrap(
                services.sequencer
                    .resume(clientSessionId)
                    .pipe(
                        Effect.as(services.appState.events),
                        Effect.mapError(fault),
                    ),
            ),
        "panel.command": (input) =>
            Effect.gen(function* () {
                if (!services.lifecycle.acceptingInput())
                    return yield* Effect.fail({
                        code: "stopping",
                        message: "Daemon is stopping.",
                    });
                const hash = createHash("sha256")
                    .update(JSON.stringify(input))
                    .digest("hex");
                const settled = yield* services.sequencer.submitEffect(
                    input.clientSessionId,
                    {
                        sequence: input.sequence,
                        requestId: input.requestId,
                        hash,
                    },
                    attempt(() => applyWebCommand(services, input)),
                );
                if (!settled.ok)
                    return yield* Effect.fail(fault(settled.error));
                const { checkpoint } = yield* services.sequencer.resume(
                    input.clientSessionId,
                );
                const { state, ...result } = settled.value;
                return { result, state: state ?? null, checkpoint };
            }).pipe(Effect.mapError(fault)),
        "notifications.read": ({ clientSessionId, ids }) =>
            Effect.gen(function* () {
                yield* services.sequencer.resume(clientSessionId);
                if (!services.lifecycle.acceptingInput())
                    return yield* Effect.fail({
                        code: "stopping",
                        message: "Daemon is stopping.",
                    });
                const work = yield* services.tasks.start(
                    Effect.gen(function* () {
                        const unread = yield* attempt(() =>
                            services.db.messages.unreadNotifications(),
                        );
                        const targets = unread
                            .filter(
                                (row) =>
                                    row.originExecutionOwnership === "daemon" &&
                                    ids.includes(row.id),
                            )
                            .map((row) => row.id);
                        yield* attempt(() =>
                            services.db.messages.markRead(targets, Date.now()),
                        );
                        const state = yield* services.appState.updateEffect({
                            notificationsRead: targets,
                        });
                        return { read: targets.length, state: state ?? null };
                    }),
                );
                return yield* Fiber.join(work);
            }).pipe(Effect.mapError(fault)),
    });
}

/** Mounted by the Effect HTTP server at /api/rpc. */
export function applicationSocket(services: DaemonServices) {
    return RpcServer.toHttpEffectWebsocket(ApplicationRpc).pipe(
        Effect.provide(applicationHandlers(services)),
        Effect.provide(RpcSerialization.layerJson),
    );
}
