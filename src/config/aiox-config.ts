import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse as parseYaml } from "yaml";
import { z } from "zod";

/**
 * aiox.yaml v1 schema and loader.
 *
 * Field set mirrors docs/specs/aiox-compose-contract.md §6 exactly. `agents[].command`/
 * `agents[].config` and top-level `capabilities`/`policies` are Phase 2 fields and are
 * deliberately absent here, so `.strict()` on every object level rejects them (and any
 * other unknown key, e.g. a `version` field) instead of silently dropping them.
 *
 * Semantic validation (namespace uniqueness, dangling references, duplicate directed
 * pairs, the `"*"` reserved name) is out of scope for this module — see §6 Validator
 * Rules, implemented separately in `aiox-config-validator.ts`.
 */

export const AIOX_CONFIG_FILE_NAME = "aiox.yaml";

const agentTypeSchema = z.enum(["codex", "claude-code"]);

const instructionsSchema = z
  .object({
    global: z.string().optional(),
  })
  .strict();

const agentSchema = z
  .object({
    name: z.string().min(1),
    type: agentTypeSchema,
    role: z.string().optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
  })
  .strict();

const directedToSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)),
]);

const directedEntrySchema = z
  .object({
    from: z.string().min(1),
    to: directedToSchema,
  })
  .strict();

/**
 * Opaque per §6 Routes: `routes[].policy` is a documented extension point. Parsing
 * only confirms it is an object — its internal shape is not validated or enforced.
 */
const routePolicySchema = z.record(z.string(), z.unknown());

const routeSchema = z
  .object({
    name: z.string().min(1),
    members: z.array(z.string().min(1)),
    directed: z.array(directedEntrySchema).optional(),
    policy: routePolicySchema.optional(),
  })
  .strict();

export const aioxConfigSchema = z
  .object({
    project: z.string().min(1),
    instructions: instructionsSchema.optional(),
    agents: z.array(agentSchema),
    routes: z.array(routeSchema).optional(),
  })
  .strict();

export type AioxAgentType = z.infer<typeof agentTypeSchema>;
export type AioxInstructionsConfig = z.infer<typeof instructionsSchema>;
export type AioxAgentConfig = z.infer<typeof agentSchema>;
export type AioxDirectedEntry = z.infer<typeof directedEntrySchema>;
export type AioxRouteConfig = z.infer<typeof routeSchema>;
export type AioxConfig = z.infer<typeof aioxConfigSchema>;

export type AioxConfigErrorCode =
  | "not_found"
  | "invalid_yaml"
  | "invalid_schema"
  | "invalid_semantics";

/** One semantic (§6 Validator Rules) violation, identified by a zod-style dot path. */
export interface AioxConfigSemanticIssue {
  path: string;
  message: string;
}

export class AioxConfigError extends Error {
  readonly code: AioxConfigErrorCode;
  readonly issues?: z.core.$ZodIssue[];
  readonly semanticIssues?: AioxConfigSemanticIssue[];

  constructor(
    message: string,
    options: {
      code: AioxConfigErrorCode;
      issues?: z.core.$ZodIssue[];
      semanticIssues?: AioxConfigSemanticIssue[];
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AioxConfigError";
    this.code = options.code;
    this.issues = options.issues;
    this.semanticIssues = options.semanticIssues;
  }
}

/** Validates already-parsed YAML data (e.g. `yaml.parse()` output) against the v1 schema. */
export function parseAioxConfig(raw: unknown): AioxConfig {
  const result = aioxConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new AioxConfigError(`Invalid ${AIOX_CONFIG_FILE_NAME}: ${z.prettifyError(result.error)}`, {
      code: "invalid_schema",
      issues: result.error.issues,
    });
  }
  return result.data;
}

/**
 * Reads and parses `aiox.yaml` from `cwd` (default `process.cwd()`). Discovery is
 * cwd-fixed by design — no parent-directory search, no `--file` override (G2 Kickoff
 * decision, docs/specs/aiox-compose-contract.md §6).
 */
export function loadAioxConfig(cwd: string = process.cwd()): AioxConfig {
  const filePath = join(cwd, AIOX_CONFIG_FILE_NAME);

  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code === "ENOENT") {
      throw new AioxConfigError(`${AIOX_CONFIG_FILE_NAME} not found at ${filePath}`, {
        code: "not_found",
        cause: error,
      });
    }
    throw new AioxConfigError(
      `Failed to read ${AIOX_CONFIG_FILE_NAME} at ${filePath}: ${errno.message ?? String(error)}`,
      {
        code: "not_found",
        cause: error,
      },
    );
  }

  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AioxConfigError(`Failed to parse ${AIOX_CONFIG_FILE_NAME} as YAML: ${message}`, {
      code: "invalid_yaml",
      cause: error,
    });
  }

  return parseAioxConfig(raw);
}
