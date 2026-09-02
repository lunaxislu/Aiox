import { z } from "zod";

export const gatewaySubscribeMethod = "gateway.subscribe" as const;

export const sessionCredentialSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43,}$/);

export const gatewaySubscribeParamsSchema = z.strictObject({
  credential: sessionCredentialSchema,
});

export const gatewayEventPayloadSchema = z.strictObject({
  serverEpoch: z.string().min(1),
  data: z.unknown(),
});

export type GatewaySubscribeParams = z.infer<
  typeof gatewaySubscribeParamsSchema
>;
export type GatewayEventPayload = z.infer<typeof gatewayEventPayloadSchema>;
