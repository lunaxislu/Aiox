import { execFile } from "node:child_process";

import type {
  HostAdapter,
  HostAdapterAgentSurfaceRequest,
  HostAdapterDetectContext,
  HostAdapterPreflightResult,
} from "./host-adapter.js";

export interface CmuxCommandResult {
  stdout: string;
  stderr: string;
}

export type CmuxCommandRunner = (
  command: string,
  args: readonly string[],
) => Promise<CmuxCommandResult>;

export interface CreateCmuxHostAdapterOptions {
  env?: Readonly<Record<string, string | undefined>>;
  executable?: string;
  runCommand?: CmuxCommandRunner;
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseSurfaceRef(output: string): string {
  const match = output.match(/(?:^|\s)(surface:[^\s]+)/);
  if (!match?.[1]) {
    throw new Error(`cmux new-pane did not return a surface ref: ${output.trim() || "<empty>"}`);
  }
  return match[1];
}

function encodeShellVariable(name: string, value: string): string {
  if (value.includes("\0")) {
    throw new Error("cmux surface command values cannot contain NUL bytes");
  }
  const encoded = [...Buffer.from(value, "utf8")]
    .map((byte) => `\\0${byte.toString(8).padStart(3, "0")}`)
    .join("");
  return `${name}=$(printf '%b.' '${encoded}'); ${name}=\${${name}%.}`;
}

export function buildCmuxSurfaceCommandText(
  request: Pick<HostAdapterAgentSurfaceRequest, "cwd" | "env" | "command" | "args">,
): string {
  const values = [request.cwd, ...Object.values(request.env), request.command, ...request.args];
  const variableNames = values.map((_, index) => `_aiox_word_${index}`);
  const assignments = values.map((value, index) =>
    encodeShellVariable(variableNames[index]!, value),
  );
  const environment = Object.keys(request.env).map((name, index) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`invalid environment variable name: ${name}`);
    }
    return `"${name}=\$${variableNames[index + 1]}"`;
  });
  const invocationStart = 1 + environment.length;
  const invocation = variableNames.slice(invocationStart).map((name) => `"$${name}"`);
  return `(${assignments.join("; ")}; cd -- "$${variableNames[0]}" && { if [ -t 1 ]; then clear || :; fi; env ${[
    ...environment,
    ...invocation,
  ].join(" ")}; })`;
}

function runCommand(command: string, args: readonly string[]): Promise<CmuxCommandResult> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export function createCmuxHostAdapter(
  options: CreateCmuxHostAdapterOptions = {},
): HostAdapter {
  const env = options.env ?? process.env;
  const executable = options.executable ?? "cmux";
  const execute = options.runCommand ?? runCommand;
  let currentWorkspace: string | null = null;

  async function executeLaunchStep(args: readonly string[]): Promise<CmuxCommandResult> {
    try {
      return await execute(executable, args);
    } catch (error) {
      throw new Error(`cmux ${args[0]} failed: ${describeError(error)}`);
    }
  }

  return {
    id: "cmux",
    detect(_context: HostAdapterDetectContext) {
      return hasValue(env.CMUX_WORKSPACE_ID);
    },
    async staticPreflight(): Promise<HostAdapterPreflightResult> {
      try {
        await execute(executable, ["version"]);
      } catch (error) {
        return {
          ok: false,
          reason: `cmux executable is unavailable: ${describeError(error)}`,
        };
      }
      for (const command of ["new-pane", "send", "send-key"] as const) {
        try {
          await execute(executable, [command, "--help"]);
        } catch (error) {
          return {
            ok: false,
            reason: `cmux required CLI capability is unavailable (${command}): ${describeError(error)}`,
          };
        }
      }
      return { ok: true };
    },
    async dynamicPreflight(): Promise<HostAdapterPreflightResult> {
      try {
        await execute(executable, ["ping"]);
        const result = await execute(executable, ["current-workspace"]);
        const workspace = result.stdout.trim();
        if (!hasValue(workspace)) {
          throw new Error("current-workspace returned an empty reference");
        }
        currentWorkspace = workspace;
        return { ok: true };
      } catch (error) {
        currentWorkspace = null;
        return {
          ok: false,
          reason: `cmux current workspace is unavailable: ${describeError(error)}`,
        };
      }
    },
    async createSurfaceAndStart(request: HostAdapterAgentSurfaceRequest): Promise<void> {
      if (currentWorkspace === null) {
        throw new Error("cmux dynamic preflight has not resolved a current workspace");
      }
      const pane = await executeLaunchStep([
        "new-pane",
        "--type",
        "terminal",
        "--direction",
        "right",
        "--workspace",
        currentWorkspace,
      ]);
      const surface = parseSurfaceRef(pane.stdout);
      await executeLaunchStep([
        "send",
        "--workspace",
        currentWorkspace,
        "--surface",
        surface,
        buildCmuxSurfaceCommandText(request),
      ]);
      await executeLaunchStep([
        "send-key",
        "--workspace",
        currentWorkspace,
        "--surface",
        surface,
        "enter",
      ]);
    },
  };
}
