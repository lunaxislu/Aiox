#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import { createNodeCliPlatform } from "./node-platform.js";
import { createCliOperations } from "./operations.js";
import { parseCliCommand } from "./parse.js";
import { runCliCommand } from "./run.js";

export * from "./node-platform.js";
export * from "./operations.js";
export * from "./parse.js";
export * from "./run.js";

export async function main(args = process.argv.slice(2)): Promise<number> {
  let command;
  try {
    command = parseCliCommand(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
  return runCliCommand(command, createCliOperations(createNodeCliPlatform()), {
    stdout: (message) => console.log(message),
    stderr: (message) => console.error(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}
