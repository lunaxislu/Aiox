import { z } from "zod";

export const endpointDiscoverySchema = z.strictObject({
  origin: z.string().regex(/^http:\/\/127\.0\.0\.1:\d+$/),
  pid: z.number().int().positive(),
  serverEpoch: z.string().min(1),
});

export type EndpointDiscovery = z.infer<typeof endpointDiscoverySchema>;

export function controlWebSocketUrl(endpoint: EndpointDiscovery): string {
  return `${endpoint.origin.replace(/^http:/, "ws:")}/ws/control`;
}
