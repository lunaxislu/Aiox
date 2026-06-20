import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, sep } from "node:path";

/**
 * Runtime profile = the single decider of the namespace bundle (socket / state /
 * external config). One `resolveProfile()` call fixes dev|build|release and every
 * path derives from it, so "dev but talking to the release daemon" is structurally
 * impossible. Individual `AIOX_*_PATH` env vars stay as per-path escape hatches.
 *
 * Supported transport today is a Unix domain socket (macOS / Linux). Windows
 * support is deferred to a later round; see
 * docs/decisions/runtime-profile-namespace-isolation.md.
 */
export type AioxProfile = "dev" | "build" | "release";

const VALID_PROFILES: readonly AioxProfile[] = ["dev", "build", "release"];

/**
 * Resolves the active runtime profile. `AIOX_PROFILE` (injected by pnpm dev/build
 * scripts) wins; otherwise the bin path is sniffed. Installed binaries fall through
 * to `release`.
 */
export function resolveProfile(
  env: NodeJS.ProcessEnv = process.env,
  binPath: string | undefined = process.argv[1],
): AioxProfile {
  const explicit = env.AIOX_PROFILE?.trim();
  if (explicit) {
    if ((VALID_PROFILES as readonly string[]).includes(explicit)) {
      return explicit as AioxProfile;
    }
    throw new Error(
      `Invalid AIOX_PROFILE="${explicit}". Expected "dev", "build", or "release".`,
    );
  }
  return detectProfileFromBinPath(binPath);
}

function detectProfileFromBinPath(binPath: string | undefined): AioxProfile {
  if (!binPath) {
    return "release";
  }
  if (binPath.endsWith(".ts")) {
    return "dev";
  }
  // node_modules wins over dist: an installed package ships its own dist/.
  if (binPath.includes(`${sep}node_modules${sep}`)) {
    return "release";
  }
  if (binPath.includes(`${sep}dist${sep}`)) {
    return "build";
  }
  return "release";
}

/**
 * Base directory for a profile's namespace bundle. `release` keeps the historical
 * `~/.aiox` root (backward compatible); dev/build nest under it.
 */
function profileBaseDir(profile: AioxProfile, home: string): string {
  const root = join(home, ".aiox");
  return profile === "release" ? root : join(root, profile);
}

/**
 * Validates a path override env var. The contract is *absolute* — a relative path
 * would re-resolve against each child process's cwd (Claude/Codex launch from varying
 * dirs), which silently re-blurs the very namespace isolation this resolver enforces.
 * So a relative override is a configuration error, not a soft fallback.
 */
function requireAbsoluteOverride(name: string, value: string): string {
  if (!isAbsolute(value)) {
    throw new Error(`${name} must be an absolute path, got "${value}".`);
  }
  return value;
}

export interface PathResolveOptions {
  /** Defaults to `resolveProfile(env)`. */
  profile?: AioxProfile;
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to `os.homedir()`. Injectable for tests. */
  homeDir?: string;
}

/**
 * Daemon socket path for the active profile. `AIOX_SOCKET_PATH` (absolute) is the
 * top-priority escape hatch; release stays at `~/.aiox/daemon.sock`. Creates the
 * profile dir as a side effect (the socket file itself is created by the listener).
 */
export function getSocketPath(opts: PathResolveOptions = {}): string {
  const env = opts.env ?? process.env;
  if (env.AIOX_SOCKET_PATH) {
    return requireAbsoluteOverride("AIOX_SOCKET_PATH", env.AIOX_SOCKET_PATH);
  }
  const home = opts.homeDir ?? homedir();
  const profile = opts.profile ?? resolveProfile(env);
  const dir = profileBaseDir(profile, home);
  mkdirSync(dir, { recursive: true });
  return join(dir, "daemon.sock");
}

/**
 * File-backed state DB path for the active profile. `AIOX_DB_PATH` (absolute) is the
 * top-priority escape hatch; release stays at `~/.aiox/state.db`.
 *
 * SCAFFOLD ONLY — the production daemon currently runs `:memory:` (`src/daemon/run.ts`).
 * This computes a path but is not yet wired; when the file DB lands it rides the same
 * profile mechanism. Pure (no dir creation) so it stays dormant and test-friendly.
 */
export function getStatePath(opts: PathResolveOptions = {}): string {
  const env = opts.env ?? process.env;
  if (env.AIOX_DB_PATH) {
    return requireAbsoluteOverride("AIOX_DB_PATH", env.AIOX_DB_PATH);
  }
  const home = opts.homeDir ?? homedir();
  const profile = opts.profile ?? resolveProfile(env);
  return join(profileBaseDir(profile, home), "state.db");
}
