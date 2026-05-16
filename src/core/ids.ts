import { randomUUID } from "node:crypto";

export const idPrefixes = {
  agent: "agent",
  pair: "pair",
  route: "route",
  message: "message",
  delivery: "delivery",
  event: "event",
} as const;

export type IdKind = keyof typeof idPrefixes;

export type IdSuffixFactory = () => string;

export type PrefixedIdFactory = (kind: IdKind) => string;

export function createPrefixedIdFactory(
  createSuffix: IdSuffixFactory,
): PrefixedIdFactory {
  return (kind) => `${idPrefixes[kind]}_${createSuffix()}`;
}

export const createRandomPrefixedId =
  createPrefixedIdFactory(randomUUID);
