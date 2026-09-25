import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, open, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfig, saveConfig } from "@aiox/config";
import { expect, it } from "vitest";

function parseDaemonRecords(text: string) {
    const lines = text.trim().split("\n");
    const records: Array<Record<string, unknown>> = [];
    const runtimeWarnings: string[] = [];

    for (const line of lines) {
        if (line.startsWith("{"))
            records.push(JSON.parse(line) as Record<string, unknown>);
        else runtimeWarnings.push(line);
    }

    if (runtimeWarnings.length > 0) {
        expect(runtimeWarnings).toHaveLength(2);
        expect(runtimeWarnings[0]).toMatch(
            /^\(node:\d+\) ExperimentalWarning: SQLite is an experimental feature and might change at any time$/,
        );
        expect(runtimeWarnings[1]).toBe(
            "(Use `node --trace-warnings ...` to show where the warning was created)",
        );
    }
    return records;
}

async function ports() {
    const listeners = [createServer(), createServer()];
    await Promise.all(
        listeners.map(
            (server) =>
                new Promise<void>((resolve) =>
                    server.listen(0, "127.0.0.1", resolve),
                ),
        ),
    );
    const values = listeners.map(
        (server) => (server.address() as { port: number }).port,
    );
    await Promise.all(
        listeners.map(
            (server) =>
                new Promise<void>((resolve) => server.close(() => resolve())),
        ),
    );
    return { daemon: values[0]!, web: values[1]! };
}

it.each(["SIGTERM", "http"] as const)(
    "keeps real daemon file diagnostics and protocol output separate through %s shutdown",
    async (shutdown) => {
        const home = await mkdtemp(join(tmpdir(), "aiox-w8-main-"));
        await saveConfig(
            {
                ports: await ports(),
                terminal: { shell: process.execPath, args: ["-i"], cwd: home },
            },
            { home },
        );
        const config = await loadConfig({ home });
        const path = join(home, ".aiox", "daemon.log");
        const log = await open(path, "a");
        const child = spawn(
            process.execPath,
            ["dist/main.js", "--config-stdin"],
            {
                stdio: ["pipe", log.fd, log.fd],
                env: {
                    ...process.env,
                    AIOX_MCP_TOKEN: "secret-environment-token",
                },
            },
        );
        const exited = once(child, "exit");
        child.stdin!.end(JSON.stringify({ home, config }));
        const url = `http://127.0.0.1:${config.ports.daemon}`;
        try {
            await expect
                .poll(
                    async () => {
                        const response = await fetch(`${url}/api/status`).catch(
                            () => undefined,
                        );
                        return response?.status;
                    },
                    // Process startup under the parallel suite can exceed poll's 1s default.
                    { timeout: 5000 },
                )
                .toBe(200);
            const failed = await fetch(
                `${url}/api/hosts/private-input?secret=private-query`,
            );
            expect(failed.status).toBe(404);
            expect(await failed.json()).toMatchObject({
                code: expect.any(String),
                message: expect.any(String),
            });
            const requestId = failed.headers.get("x-request-id");
            expect(requestId).toMatch(/^[a-f0-9-]{36}$/);
            const mcp = await fetch(`${url}/mcp/network`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: "Bearer secret-credential",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "initialize",
                    params: {},
                }),
            });
            expect(mcp.status).toBe(401);
            expect(await mcp.json()).toMatchObject({
                code: "unauthenticated",
                message: "A valid runtime credential is required.",
            });
            if (shutdown === "SIGTERM") child.kill("SIGTERM");
            else {
                const stop = await fetch(`${url}/api/daemon/stop`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ force: true }),
                });
                expect(stop.status).toBe(200);
            }
            expect((await exited)[0]).toBe(0);
            const text = await readFile(path, "utf8");
            const records = parseDaemonRecords(text);
            expect(records).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: "Daemon listening",
                        daemonPort: config.ports.daemon,
                    }),
                    expect.objectContaining({
                        msg: "API request failed",
                        requestId,
                    }),
                ]),
            );
            expect(records.at(-1)).toMatchObject({ msg: "Daemon stopped" });
            expect(
                records.filter((record) => record.msg === "Daemon listening"),
            ).toHaveLength(1);
            expect(
                records.filter((record) => record.msg === "Daemon stopped"),
            ).toHaveLength(1);
            expect(records).toContainEqual(
                expect.objectContaining({
                    msg: "HTTP request received",
                    requestId,
                }),
            );
            expect(text).not.toMatch(/secret-|private-input|private-query/);
        } finally {
            if (child.exitCode === null && child.signalCode === null)
                child.kill("SIGKILL");
            await exited;
            await log.close();
            await rm(home, { recursive: true, force: true });
        }
    },
    15000,
);

it("serializes startup failure to stderr without dumping prepared input", async () => {
    const child = spawn(process.execPath, ["dist/main.js", "--config-stdin"], {
        stdio: "pipe",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += String(data)));
    child.stderr.on("data", (data) => (stderr += String(data)));
    const exited = once(child, "exit");
    child.stdin.end('{"secret":"private-config"');
    expect((await exited)[0]).toBe(1);
    expect(stdout).toBe("");
    expect(parseDaemonRecords(stderr)).toContainEqual(
        expect.objectContaining({
            level: 60,
            msg: "Daemon startup failed",
            err: { type: "SyntaxError" },
        }),
    );
    expect(stderr).not.toContain("private-config");
});

it.each(["--port", "--web-port"])(
    "reports safe invalid port context for %s",
    async (flag) => {
        const child = spawn(process.execPath, [
            "dist/main.js",
            flag,
            "private-invalid-port",
        ]);
        const exited = once(child, "exit");
        let stderr = "";
        let stdout = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });
        expect((await exited)[0]).toBe(1);
        expect(stdout).toBe("");
        expect(parseDaemonRecords(stderr)).toContainEqual(
            expect.objectContaining({
                msg: "Daemon startup failed",
                stage: "arguments",
                field: flag,
                err: { type: "Error", code: "EINVALIDPORT" },
            }),
        );
        expect(stderr).not.toContain("private-invalid-port");
    },
);
