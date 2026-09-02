import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { sessionCredentialSchema } from "@aiox/protocol";

export function createSessionCredential(): string {
  return sessionCredentialSchema.parse(randomBytes(32).toString("base64url"));
}

export async function publishSessionCredential(
  sessionTokenFile: string,
  credential: string,
): Promise<void> {
  const validated = sessionCredentialSchema.parse(credential);
  await mkdir(path.dirname(sessionTokenFile), { recursive: true });
  const temporaryFile = `${sessionTokenFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${validated}\n`, { mode: 0o600 });
    await rename(temporaryFile, sessionTokenFile);
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

export async function readSessionCredential(
  sessionTokenFile: string,
): Promise<string> {
  return sessionCredentialSchema.parse(
    (await readFile(sessionTokenFile, "utf8")).trim(),
  );
}

export async function removeOwnedSessionCredential(
  sessionTokenFile: string,
  credential: string,
): Promise<void> {
  let current: string;
  try {
    current = (await readFile(sessionTokenFile, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const parsed = sessionCredentialSchema.safeParse(current);
  if (parsed.success && parsed.data === credential) {
    await rm(sessionTokenFile, { force: true });
  }
}
