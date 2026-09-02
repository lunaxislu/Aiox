import { z } from "zod";

export const localServerLifecycleSchema = z.enum([
  "starting",
  "running",
  "quiescing",
  "stopping",
  "stopped",
  "failed",
]);

export const gatewaySnapshotSchema = z.strictObject({
  server: z.strictObject({
    epoch: z.string().min(1),
    lifecycle: localServerLifecycleSchema,
  }),
  stateVersion: z.number().int().nonnegative(),
  nextEventSeq: z.number().int().nonnegative(),
});

export type LocalServerLifecycle = z.infer<typeof localServerLifecycleSchema>;
export type GatewaySnapshot = z.infer<typeof gatewaySnapshotSchema>;
