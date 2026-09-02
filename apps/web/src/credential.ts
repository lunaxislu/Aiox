import { sessionCredentialSchema } from "@aiox/protocol";

export function consumeSessionCredential(
  currentLocation: Pick<Location, "hash" | "pathname" | "search"> = window.location,
  currentHistory: Pick<History, "replaceState" | "state"> = window.history,
): string {
  const credential = new URLSearchParams(
    currentLocation.hash.startsWith("#")
      ? currentLocation.hash.slice(1)
      : currentLocation.hash,
  ).get("session");

  currentHistory.replaceState(
    currentHistory.state,
    "",
    `${currentLocation.pathname}${currentLocation.search}`,
  );

  const parsed = sessionCredentialSchema.safeParse(credential);
  if (!parsed.success) throw new Error("Session credential is missing or invalid");
  return parsed.data;
}
