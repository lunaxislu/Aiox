import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Returns the stable default daemon socket path for the current user.
 * Override with AIOX_SOCKET_PATH environment variable.
 */
export function getDefaultSocketPath(): string {
  if (process.env.AIOX_SOCKET_PATH) {
    return process.env.AIOX_SOCKET_PATH;
  }

  const dir = join(homedir(), ".aiox");
  mkdirSync(dir, { recursive: true });
  return join(dir, "daemon.sock");
}
