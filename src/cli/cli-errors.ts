/**
 * Shared CLI parsing primitives with no dependency on any other `src/cli` module.
 * Kept as a leaf module so `parse.ts` and `host-command.ts` can both depend on it
 * without forming a circular import between them.
 */

export const CLI_PARSE_ERROR_EXIT_CODE = 1;

export class CliParseError extends Error {
  readonly code: string;
  readonly exitCode: number;

  constructor(message: string, options: { code: string; exitCode: number }) {
    super(message);
    this.name = "CliParseError";
    this.code = options.code;
    this.exitCode = options.exitCode;
  }
}

export function requireNonEmptyText(value: string, fieldLabel: string): string {
  if (value.trim().length === 0) {
    throw new CliParseError(`${fieldLabel} must not be empty`, {
      code: "aiox.invalidOptionValue",
      exitCode: CLI_PARSE_ERROR_EXIT_CODE,
    });
  }

  return value;
}

export function requireNonEmptyName(value: string): string {
  if (value.trim().length === 0) {
    throw new CliParseError("Name must not be empty", {
      code: "aiox.invalidName",
      exitCode: CLI_PARSE_ERROR_EXIT_CODE,
    });
  }

  if (/[\x00-\x1F\x7F]/.test(value)) {
    throw new CliParseError("Name must not contain control characters", {
      code: "aiox.invalidName",
      exitCode: CLI_PARSE_ERROR_EXIT_CODE,
    });
  }

  return value;
}
