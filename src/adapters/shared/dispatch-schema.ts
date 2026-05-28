import { z } from "zod";

export const dispatchSummaryOutputSchema = z.object({
  delivered: z.number(),
  deferred: z.array(
    z.object({
      targetAgentId: z.string(),
      reason: z.string(),
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
