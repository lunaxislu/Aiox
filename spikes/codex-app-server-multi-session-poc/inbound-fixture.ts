import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import { z } from "zod";

export type InboundDeliveryFixtureInput = {
  deliveryId: string;
  marker: string;
};

export function buildInboundDeliveryResult(input: InboundDeliveryFixtureInput) {
  const structuredContent = {
    deliveryId: input.deliveryId,
    marker: input.marker,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export function createInboundFixtureServer(): McpServer {
  const mcp = new McpServer(
    { name: "aiox-inbound-fixture", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  mcp.registerTool(
    "deliver_message",
    {
      description: "Return a controlled inbound aiox delivery marker for Codex TUI presentation tests.",
      inputSchema: z.object({
        deliveryId: z.string().min(1),
        marker: z.string().min(1),
      }),
      outputSchema: z.object({
        deliveryId: z.string(),
        marker: z.string(),
      }),
    },
    async (input) => buildInboundDeliveryResult(input),
  );

  return mcp;
}

async function main(): Promise<void> {
  const mcp = createInboundFixtureServer();
  await mcp.connect(new StdioServerTransport());
}

if (process.argv[1]?.endsWith("inbound-fixture.ts")) {
  void main();
}
