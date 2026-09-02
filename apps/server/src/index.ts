#!/usr/bin/env node

import { fileURLToPath } from "node:url";

export * from "./bootstrap/local-server.js";
export * from "./process/run-server.js";
export * from "./runtime-files/session-credential.js";
export * from "./runtime-files/server-lock.js";

import { runServerProcess } from "./process/run-server.js";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runServerProcess(process.argv.slice(2));
}
