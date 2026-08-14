import { z } from "zod";

export const dispatchSummaryOutputSchema = z.object({
  delivered: z.number(),
  deferred: z.array(
    z.object({
      targetAgentId: z.string(),
      reason: z.string(),
      cause: z.literal("claude_channel_port_in_use").optional(),
      eligibility: z.string().optional(),
    }),
  ),
  failed: z.array(
    z.object({
      targetAgentId: z.string(),
      reason: z.string(),
    }),
  ),
});
