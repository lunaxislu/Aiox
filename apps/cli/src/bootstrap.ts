import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { configPath, loadConfig } from "@aiox/config";

import type { CliPort } from "@/requests";

const execFileAsync = promisify(execFile);

/** Stage 1 provides environment diagnosis; daemon/controller operations arrive in Stage 2. */
export function createFoundationPort(): CliPort {
    return {
        async execute(request) {
            if (request.command === "doctor") {
                const config = await loadConfig();
                let git: {
                    available: boolean;
                    version?: string;
                    error?: string;
                };
                try {
                    const { stdout } = await execFileAsync(
                        "git",
                        ["--version"],
                        { timeout: 5000 },
                    );
                    git = { available: true, version: stdout.trim() };
                } catch (error) {
                    git = {
                        available: false,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    };
                }
                return {
                    node: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    environment:
                        process.platform === "linux" &&
                        Boolean(
                            process.env.WSL_DISTRO_NAME ||
                            process.env.WSL_INTEROP,
                        )
                            ? "wsl"
                            : "native",
                    config: { path: configPath(), ports: config.ports },
                    git,
                    vendorIntegration: "not implemented",
                };
            }
            throw new Error(
                `${request.command}: daemon/application integration is not available yet. No operation was performed.`,
            );
        },
    };
}
