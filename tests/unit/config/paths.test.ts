import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getSocketPath,
  getStatePath,
  resolveProfile,
} from "../../../src/config/paths.js";

const HOME = join(tmpdir(), "aiox-paths-test-home");

describe("resolveProfile", () => {
  it("prefers explicit AIOX_PROFILE over binPath detection", () => {
    expect(resolveProfile({ AIOX_PROFILE: "dev" }, "/anything/aiox.js")).toBe(
      "dev",
    );
    expect(resolveProfile({ AIOX_PROFILE: "build" }, "/x.ts")).toBe("build");
    expect(resolveProfile({ AIOX_PROFILE: "release" }, "/x.ts")).toBe(
      "release",
    );
  });

  it("trims surrounding whitespace on AIOX_PROFILE", () => {
    expect(resolveProfile({ AIOX_PROFILE: "  dev  " }, undefined)).toBe("dev");
  });

  it("throws on an invalid AIOX_PROFILE value", () => {
    expect(() => resolveProfile({ AIOX_PROFILE: "prod" }, undefined)).toThrow(
      /Invalid AIOX_PROFILE/,
    );
  });

  it("detects dev from a .ts bin path", () => {
    expect(resolveProfile({}, "/repo/src/bin/aiox.ts")).toBe("dev");
  });

  it("detects release from a node_modules path (installed)", () => {
    expect(
      resolveProfile({}, "/usr/lib/node_modules/aiox/dist/bin/aiox.js"),
    ).toBe("release");
  });

  it("detects build from a dist path that is not under node_modules", () => {
    expect(resolveProfile({}, "/repo/dist/src/bin/aiox.js")).toBe("build");
  });

  it("falls back to release for an unknown / missing bin path", () => {
    expect(resolveProfile({}, "/some/global/aiox")).toBe("release");
    expect(resolveProfile({}, undefined)).toBe("release");
  });
});

describe("getSocketPath", () => {
  it("honors an explicit AIOX_SOCKET_PATH above everything (escape hatch)", () => {
    expect(
      getSocketPath({
        env: { AIOX_SOCKET_PATH: "/custom/aiox.sock", AIOX_PROFILE: "dev" },
        homeDir: HOME,
      }),
    ).toBe("/custom/aiox.sock");
  });

  it("rejects a relative AIOX_SOCKET_PATH (absolute contract, fail-fast)", () => {
    expect(() =>
      getSocketPath({ env: { AIOX_SOCKET_PATH: "rel/aiox.sock" }, homeDir: HOME }),
    ).toThrow(/AIOX_SOCKET_PATH must be an absolute path/);
  });

  it("keeps the release socket at ~/.aiox/daemon.sock (backward compatible)", () => {
    expect(getSocketPath({ profile: "release", env: {}, homeDir: HOME })).toBe(
      join(HOME, ".aiox", "daemon.sock"),
    );
  });

  it("namespaces dev / build sockets under their profile dir", () => {
    expect(getSocketPath({ profile: "dev", env: {}, homeDir: HOME })).toBe(
      join(HOME, ".aiox", "dev", "daemon.sock"),
    );
    expect(getSocketPath({ profile: "build", env: {}, homeDir: HOME })).toBe(
      join(HOME, ".aiox", "build", "daemon.sock"),
    );
  });
});

describe("getStatePath (scaffold)", () => {
  it("honors an explicit AIOX_DB_PATH above everything", () => {
    expect(
      getStatePath({ env: { AIOX_DB_PATH: "/custom/state.db" }, homeDir: HOME }),
    ).toBe("/custom/state.db");
  });

  it("rejects a relative AIOX_DB_PATH (absolute contract, fail-fast)", () => {
    expect(() =>
      getStatePath({ env: { AIOX_DB_PATH: "rel/state.db" }, homeDir: HOME }),
    ).toThrow(/AIOX_DB_PATH must be an absolute path/);
  });

  it("keeps the release state file at ~/.aiox/state.db", () => {
    expect(getStatePath({ profile: "release", env: {}, homeDir: HOME })).toBe(
      join(HOME, ".aiox", "state.db"),
    );
  });

  it("namespaces dev / build state under their profile dir", () => {
    expect(getStatePath({ profile: "dev", env: {}, homeDir: HOME })).toBe(
      join(HOME, ".aiox", "dev", "state.db"),
    );
  });

  it("derives the same profile bundle as the socket (paths stay grouped)", () => {
    const opts = { profile: "build" as const, env: {}, homeDir: HOME };
    const socketDir = getSocketPath(opts).slice(
      0,
      getSocketPath(opts).lastIndexOf(sep),
    );
    const stateDir = getStatePath(opts).slice(
      0,
      getStatePath(opts).lastIndexOf(sep),
    );
    expect(stateDir).toBe(socketDir);
  });
});

describe("runtime directory permissions (POSIX owner-only)", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "aiox-paths-perm-"));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it("creates a new runtime directory with owner-only (0700) permissions", () => {
    const socketPath = getSocketPath({ profile: "dev", env: {}, homeDir: home });
    const dir = socketPath.slice(0, socketPath.lastIndexOf(sep));

    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("corrects an existing loosely-permissioned runtime directory to 0700", () => {
    const dir = join(home, ".aiox", "dev");
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o755);
    expect(statSync(dir).mode & 0o777).toBe(0o755);

    getSocketPath({ profile: "dev", env: {}, homeDir: home });

    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("hardens the release-profile root (~/.aiox) the same way", () => {
    const socketPath = getSocketPath({ profile: "release", env: {}, homeDir: home });
    const dir = socketPath.slice(0, socketPath.lastIndexOf(sep));

    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });
});
