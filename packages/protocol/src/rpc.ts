import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { routeOperationSchema } from "./core";
import {
    configViewSchema,
    putConfigRequestSchema,
    hostRunRequestSchema,
    hostResolveRequestSchema,
    hostResolveResultSchema,
    hostRestartRequestSchema,
    hostControlRequestSchema,
    hostAgentStartRequestSchema,
    hostAgentStopRequestSchema,
    hostCommandEventSchema,
    hostNetworkViewSchema,
    webChangeSchema,
    webCommandRequestSchema,
    webCommandResultSchema,
    webSequenceFailureSchema,
    webSnapshotSchema,
} from "./host";

export const applicationDeltaSchema = Schema.Struct({
    type: Schema.Literal("delta"),
    epoch: Schema.String,
    version: Schema.Number.check(
        Schema.isInt(),
        Schema.isGreaterThanOrEqualTo(0),
    ),
    changes: Schema.Array(webChangeSchema),
});
export type ApplicationDelta = Schema.Schema.Type<
    typeof applicationDeltaSchema
>;
export const applicationFaultSchema = Schema.Struct({
    code: Schema.String,
    message: Schema.String,
    checkpoint: Schema.optional(Schema.Number),
    stage: Schema.optional(Schema.String),
    details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});
export type ApplicationFault = Schema.Schema.Type<
    typeof applicationFaultSchema
>;
export const applicationEventSchema = Schema.Union([
    Schema.Struct({
        type: Schema.Literal("snapshot"),
        version: Schema.Number,
        snapshot: webSnapshotSchema,
    }),
    applicationDeltaSchema,
    Schema.Struct({
        type: Schema.Literal("reveal"),
        epoch: Schema.String,
        sourceTerminalId: Schema.String,
        panelId: Schema.String,
        tabId: Schema.String,
    }),
    Schema.Struct({
        type: Schema.Literal("sequence-failure"),
        failure: webSequenceFailureSchema,
    }),
]);
export type ApplicationEvent = Schema.Schema.Type<
    typeof applicationEventSchema
>;
const sessionSchema = Schema.Struct({
    clientSessionId: Schema.String,
    checkpoint: Schema.Number,
    epoch: Schema.String,
});

/** One application socket; terminal bytes/resize use the separate terminal socket. */
export const ApplicationRpc = RpcGroup.make(
    Rpc.make("host.resolve", {
        payload: {
            clientSessionId: Schema.String,
            input: hostResolveRequestSchema,
        },
        success: hostResolveResultSchema,
        error: applicationFaultSchema,
    }),
    Rpc.make("config.read", {
        payload: { clientSessionId: Schema.String },
        success: configViewSchema,
        error: applicationFaultSchema,
    }),
    Rpc.make("config.write", {
        payload: {
            clientSessionId: Schema.String,
            input: putConfigRequestSchema,
        },
        success: configViewSchema,
        error: applicationFaultSchema,
    }),
    Rpc.make("host.run", {
        payload: {
            clientSessionId: Schema.String,
            input: hostRunRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.restart", {
        payload: {
            clientSessionId: Schema.String,
            input: hostRestartRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.stop", {
        payload: {
            clientSessionId: Schema.String,
            hostId: Schema.String,
            input: hostControlRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.delete", {
        payload: {
            clientSessionId: Schema.String,
            hostId: Schema.String,
            input: hostControlRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.agent.start", {
        payload: {
            clientSessionId: Schema.String,
            input: hostAgentStartRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.agent.restart", {
        payload: {
            clientSessionId: Schema.String,
            input: hostAgentStartRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.agent.stop", {
        payload: {
            clientSessionId: Schema.String,
            hostId: Schema.String,
            input: hostAgentStopRequestSchema,
        },
        success: hostCommandEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("host.network.route", {
        payload: {
            clientSessionId: Schema.String,
            hostId: Schema.String,
            networkId: Schema.String,
            operation: routeOperationSchema,
        },
        success: hostNetworkViewSchema,
        error: applicationFaultSchema,
    }),

    Rpc.make("session.open", {
        success: sessionSchema,
        error: applicationFaultSchema,
    }),
    Rpc.make("session.resume", {
        payload: { clientSessionId: Schema.String },
        success: sessionSchema,
        error: applicationFaultSchema,
    }),
    Rpc.make("state.subscribe", {
        payload: { clientSessionId: Schema.String },
        success: applicationEventSchema,
        error: applicationFaultSchema,
        stream: true,
    }),
    Rpc.make("panel.command", {
        payload: webCommandRequestSchema,
        success: Schema.Struct({
            result: webCommandResultSchema,
            state: Schema.NullOr(applicationDeltaSchema),
            checkpoint: Schema.Number,
        }),
        error: applicationFaultSchema,
    }),
    Rpc.make("notifications.read", {
        payload: {
            clientSessionId: Schema.String,
            ids: Schema.Array(Schema.String),
        },
        success: Schema.Struct({
            read: Schema.Number,
            state: Schema.NullOr(applicationDeltaSchema),
        }),
        error: applicationFaultSchema,
    }),
);

export type WebCommandCommit = import("./host").WebCommandResult & {
    state: ApplicationDelta | undefined;
};
