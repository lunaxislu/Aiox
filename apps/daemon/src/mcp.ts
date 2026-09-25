import type { IncomingMessage } from "node:http";

import { agentViewSchema } from "@aiox/protocol";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Schema, Struct } from "effect";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import type { MessageService } from "@/messaging";
import { targetNotFound } from "@/messaging";
import type { NetworkService } from "@/networks";
import type { RuntimeRecord, RuntimeRegistry } from "@/runtimes";

import type { HttpEnv } from "./http";
import type { Context } from "./http-endpoint";

// The SDK registration remains Zod; its shape comes from the shared Effect schema.
const agentDocument = Schema.toJsonSchemaDocument(
    agentViewSchema.mapFields(
        Struct.pick(["name", "role", "description", "status", "status_reason"]),
    ),
);
const agent = z.fromJSONSchema({
    ...agentDocument.schema,
    $defs: agentDocument.definitions,
});

/** Only the header carries the credential; never the URL, argv or a log line. */
export function bearerToken(
    request: IncomingMessage | Request,
): string | undefined {
    const header =
        request.headers instanceof Headers
            ? request.headers.get("authorization")
            : request.headers.authorization;
    if (!header) return undefined;
    const [scheme, value] = header.split(" ");
    return scheme?.toLowerCase() === "bearer" && value ? value : undefined;
}

function tools(
    source: RuntimeRecord,
    networks: NetworkService,
    messages: MessageService,
): McpServer {
    const server = new McpServer({ name: "aiox", version: "0.0.0" });

    server.registerTool(
        "agents_list",
        {
            title: "List reachable agents",
            description:
                "Agents visible through your current routes. Preparing agents cannot receive messages yet. Use the returned name values as send targets. Unnamed agents use their runtime ID as their name.",
            // No inputSchema: a zero-argument tool must not reject a caller
            // that omits `arguments` entirely.
            outputSchema: { agents: z.array(agent) },
        },
        async () => {
            const agents = (await networks.reachable(source)).map((record) => ({
                name: record.name,
                role: record.role,
                description: record.description,
                status: record.status,
                status_reason: record.status_reason,
            }));
            return {
                content: [
                    { type: "text" as const, text: JSON.stringify({ agents }) },
                ],
                structuredContent: { agents },
            };
        },
    );

    server.registerTool(
        "send",
        {
            title: "Send a message to chosen agents",
            description:
                "Send content to current agents in your Network using names from agents_list or runtime IDs. Targets resolve at send time, with IDs taking precedence over names. Each distinct input has a result; aliases of one agent share a single delivery.",
            inputSchema: {
                targets: z
                    .array(z.string().min(1))
                    .min(1)
                    .describe("Agent names or runtime IDs in your Network"),
                content: z.string().min(1),
            },
            outputSchema: {
                messageId: z.string(),
                results: z.array(
                    z.object({
                        name: z
                            .string()
                            .describe(
                                "The target name or ID supplied in the input",
                            ),
                        accepted: z.boolean(),
                        error: z.string().optional(),
                    }),
                ),
            },
        },
        async ({ targets, content }) => {
            const resolved = [...new Set(targets)].map((name) => ({
                name,
                id: networks.resolveAgent(source.networkId!, name)?.id,
            }));
            const ids = resolved.flatMap(({ id }) =>
                id === undefined ? [] : [id],
            );
            // Unknown references have no runtime to attach a delivery to. An all-unknown
            // attempt gets a response ID only; no message or delivery is stored.
            const sent =
                ids.length > 0
                    ? await messages.send(source, ids, content)
                    : { messageId: uuidv7(), results: [] };
            const results = resolved.map(({ name, id }) => {
                if (id === undefined)
                    return { name, accepted: false, error: targetNotFound };
                const { accepted, error } = sent.results.find(
                    (entry) => entry.agentId === id,
                )!;
                return { name, accepted, error };
            });
            const structuredContent = { messageId: sent.messageId, results };
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(structuredContent),
                    },
                ],
                structuredContent,
                isError: results.some((result) => !result.accepted),
            };
        },
    );

    return server;
}

/**
 * One MCP server per request. Statelessness is the point: the credential, the
 * current membership and the route are all re-checked on every call, so a
 * revoked token cannot keep working through an established session.
 */
export async function handleMcpRequest(
    networkId: string,
    c: Context<HttpEnv>,
    body: unknown,
    services: {
        runtimes: RuntimeRegistry;
        networks: NetworkService;
        messages: MessageService;
    },
): Promise<Response> {
    const source = services.runtimes.authenticate(bearerToken(c.req.raw));
    if (!source)
        return c.json(
            {
                code: "unauthenticated",
                message: "A valid runtime credential is required.",
            },
            401,
        );
    if (source.networkId === null || source.networkId !== networkId)
        return c.json(
            {
                code: "wrong_network",
                message: "This credential does not belong to that network.",
            },
            403,
        );
    const server = tools(source, services.networks, services.messages);
    // Omitting sessionIdGenerator selects the SDK's stateless mode; there is no
    // session to carry a credential forward past a revoke.
    const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
    });
    c.env.outgoing.once("close", () => {
        void transport.close();
        void server.close();
    });
    // The SDK's transport class does not satisfy its own `Transport` interface
    // under exactOptionalPropertyTypes; the runtime contract is unaffected.
    await server.connect(
        transport as unknown as Parameters<McpServer["connect"]>[0],
    );
    return transport.handleRequest(c.req.raw, { parsedBody: body });
}
