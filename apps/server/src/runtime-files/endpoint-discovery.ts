import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  endpointDiscoverySchema,
  type EndpointDiscovery,
} from "@aiox/protocol";

export async function publishEndpointDiscovery(
  endpointFile: string,
  input: unknown,
): Promise<EndpointDiscovery> {
  const endpoint = endpointDiscoverySchema.parse(input);
  await mkdir(path.dirname(endpointFile), { recursive: true });
  const temporaryFile = `${endpointFile}.${endpoint.pid}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporaryFile, `${JSON.stringify(endpoint)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryFile, endpointFile);
    return endpoint;
  } catch (error) {
    await rm(temporaryFile, { force: true });
    throw error;
  }
}

export async function removeOwnedEndpoint(
  endpointFile: string,
  serverEpoch: string,
): Promise<void> {
  let current: unknown;
  try {
    current = JSON.parse(await readFile(endpointFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }

  const parsed = endpointDiscoverySchema.safeParse(current);
  if (parsed.success && parsed.data.serverEpoch === serverEpoch) {
    await rm(endpointFile, { force: true });
  }
}
