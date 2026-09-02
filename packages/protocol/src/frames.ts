import { z } from "zod";

export const requestFrameSchema = z.strictObject({
  type: z.literal("req"),
  id: z.string().min(1),
  method: z.string().min(1),
  params: z.unknown().optional(),
});

export const gatewayErrorSchema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
});

const successResponseFrameSchema = z.strictObject({
  type: z.literal("res"),
  id: z.string().min(1),
  ok: z.literal(true),
  payload: z.unknown(),
});

const errorResponseFrameSchema = z.strictObject({
  type: z.literal("res"),
  id: z.string().min(1),
  ok: z.literal(false),
  error: gatewayErrorSchema,
});

export const responseFrameSchema = z.discriminatedUnion("ok", [
  successResponseFrameSchema,
  errorResponseFrameSchema,
]);

export const eventFrameSchema = z.strictObject({
  type: z.literal("event"),
  event: z.string().min(1),
  payload: z.unknown(),
  seq: z.number().int().nonnegative(),
  stateVersion: z.number().int().nonnegative().optional(),
});

export const gatewayFrameSchema = z.union([
  requestFrameSchema,
  responseFrameSchema,
  eventFrameSchema,
]);

export type RequestFrame = z.infer<typeof requestFrameSchema>;
export type GatewayError = z.infer<typeof gatewayErrorSchema>;
export type ResponseFrame = z.infer<typeof responseFrameSchema>;
export type EventFrame = z.infer<typeof eventFrameSchema>;
export type GatewayFrame = z.infer<typeof gatewayFrameSchema>;
