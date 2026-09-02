import { z } from "zod";

export const serverStopMethod = "server.stop" as const;

export const activeExecutionDependencySchema = z.strictObject({
  kind: z.enum(["agent", "host", "terminal", "operation"]),
  id: z.string().min(1),
});

export const serverStopParamsSchema = z.strictObject({
  force: z.boolean(),
});

export const serverStopResultSchema = z.strictObject({
  accepted: z.boolean(),
  force: z.boolean(),
  blockers: z.array(activeExecutionDependencySchema),
  residualRisk: z.boolean(),
});

export type ActiveExecutionDependency = z.infer<
  typeof activeExecutionDependencySchema
>;
export type ServerStopParams = z.infer<typeof serverStopParamsSchema>;
export type ServerStopResult = z.infer<typeof serverStopResultSchema>;
