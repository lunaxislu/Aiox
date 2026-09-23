import { spawnSync } from "node:child_process";
import {
    readFileSync,
    mkdtempSync,
    openSync,
    closeSync,
    rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("service diagnostics", () => {
    it("writes structured diagnostics only to stderr without arbitrary error data", () => {
        const child = spawnSync(
            process.execPath,
            [
                "--input-type=module",
                "-e",
                `
            import { logger } from './dist/index.js';
            const err = Object.assign(new Error('secret-token prompt transcript'), {
                code: 'EIO', token: 'secret-token', payload: 'private-content',
                cause: new Error('secret-cause'),
            });
            logger.error({ runtimeId: 'runtime-1', terminalId: 'terminal-1',
                deliveryId: 'delivery-1', operationId: 'operation-1', requestId: 'request-1', operationRequestId: 'operation-request-1',
              stage: 'arguments', field: '--port', failureCode: 'preparation_timeout',
              component: 'codex', exitCode: 1, signal: null,
                err, token: 'secret-token', env: { KEY: 'secret-env' },
                body: 'private-body', headers: { authorization: 'secret-auth' },
            }, 'Storage failed');
            process.stdout.write('{"result":"unchanged"}');
        `,
            ],
            { encoding: "utf8" },
        );
        expect(child.status, child.stderr).toBe(0);
        expect(child.stdout).toBe('{"result":"unchanged"}');
        const line = JSON.parse(child.stderr.trim());
        expect(line).toMatchObject({
            level: 50,
            runtimeId: "runtime-1",
            terminalId: "terminal-1",
            deliveryId: "delivery-1",
            operationId: "operation-1",
            requestId: "request-1",
            operationRequestId: "operation-request-1",
            stage: "arguments",
            field: "--port",
            failureCode: "preparation_timeout",
            component: "codex",
            exitCode: 1,
            signal: null,
            err: { type: "Error", code: "EIO" },
            msg: "Storage failed",
        });
        expect(line.time).toEqual(expect.any(Number));
        expect(child.stderr).not.toMatch(/secret-|private-|prompt|transcript/);
    });
    it("persists the final record before immediate process exit to the CLI-owned file", () => {
        const directory = mkdtempSync(join(tmpdir(), "aiox-diagnostics-"));
        const path = join(directory, "daemon.log");
        const fd = openSync(path, "a");
        try {
            const child = spawnSync(
                process.execPath,
                [
                    "--input-type=module",
                    "-e",
                    `
                import { logger } from './dist/index.js';
                for (let i = 0; i < 100; i++) logger.info({ requestId: String(i) }, 'Request finished');
                logger.info('Daemon stopped');
                process.exit(0);
            `,
                ],
                { stdio: ["ignore", "pipe", fd] },
            );
            expect(child.status).toBe(0);
            expect(child.stdout.toString()).toBe("");
            const lines = readFileSync(path, "utf8")
                .trim()
                .split("\n")
                .map((line) => JSON.parse(line));
            expect(lines).toHaveLength(101);
            expect(lines.at(-1)).toMatchObject({ msg: "Daemon stopped" });
        } finally {
            closeSync(fd);
            rmSync(directory, { recursive: true, force: true });
        }
    });
});
