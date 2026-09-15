import type { IncomingMessage, ServerResponse } from "node:http";

import { agentViewSchema } from "@aiox/protocol";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import type { MessageService } from "@/messaging";
import type { NetworkService } from "@/networks";
import type { RuntimeRecord, RuntimeRegistry } from "@/runtimes";

const agent = agentViewSchema.pick({
    agentId: true,
    name: true,
    role: true,
    description: true,
    status: true,
    status_reason: true,
});

/** Only the header carries the credential; never the URL, argv or a log line. */
export function bearerToken(request: IncomingMessage): string | undefined {
    const header = request.headers.authorization;
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
                "Agents visible through your current routes. Preparing agents cannot receive messages yet. Names, roles and descriptions help you choose; agentId is what send takes.",
            // No inputSchema: a zero-argument tool must not reject a caller
            // that omits `arguments` entirely.
            outputSchema: { agents: z.array(agent) },
        },
        async () => {
            const agents = (await networks.reachable(source)).map((record) => ({
                agentId: record.id,
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
                "Send content to the agents you name. Only the listed agents receive it. Each target reports its own result.",
            inputSchema: {
                targets: z
                    .array(z.string().min(1))
                    .min(1)
                    .describe("agentId values from agents_list"),
                content: z.string().min(1),
            },
            outputSchema: {
                messageId: z.string(),
                results: z.array(
                    z.object({
                        agentId: z.string(),
                        accepted: z.boolean(),
                        error: z.string().optional(),
                    }),
                ),
            },
        },
        async ({ targets, content }) => {
            const sent = await messages.send(source, targets, content);
            // Per-target outcomes stay visible; a partial failure is not success.
            const results = sent.results.map(
                ({ agentId, accepted, error }) => ({
                    agentId,
                    accepted,
                    ...(error === undefined ? {} : { error }),
                }),
            );
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

function refuse(
    response: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ code, message }));
}

/**
 * One MCP server per request. Statelessness is the point: the credential, the
 * current membership and the route are all re-checked on every call, so a
 * revoked token cannot keep working through an established session.
 */
export async function handleMcpRequest(
    networkId: string,
    request: IncomingMessage,
    response: ServerResponse,
    body: unknown,
    services: {
        runtimes: RuntimeRegistry;
        networks: NetworkService;
        messages: MessageService;
    },
): Promise<void> {
    const source = services.runtimes.authenticate(bearerToken(request));
    if (!source) {
        refuse(
            response,
            401,
            "unauthenticated",
            "A valid runtime credential is required.",
        );
        return;
    }
    if (source.networkId === null || source.networkId !== networkId) {
        refuse(
            response,
            403,
            "wrong_network",
            "This credential does not belong to that network.",
        );
        return;
    }

    const server = tools(source, services.networks, services.messages);
    // Omitting sessionIdGenerator selects the SDK's stateless mode; there is no
    // session to carry a credential forward past a revoke.
    const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
    });
    response.on("close", () => {
        void transport.close();
        void server.close();
    });
    // The SDK's transport class does not satisfy its own `Transport` interface
    // under exactOptionalPropertyTypes; the runtime contract is unaffected.
    await server.connect(
        transport as unknown as Parameters<McpServer["connect"]>[0],
    );
    await transport.handleRequest(request, response, body);
}
