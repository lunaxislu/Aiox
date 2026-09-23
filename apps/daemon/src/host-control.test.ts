import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { logger } from "@aiox/diagnostics";
import { expect, test, vi } from "vitest";

import { initialHostPanel } from "./host-run";
import { startTestDaemon } from "./testing";

test("Host stop preserves shells and policy; delete waits for shell termination and retains retryable failure", async (t) => {
    const h = await startTestDaemon({
        terminal: async () => ({
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            cwd: h.home,
        }),
    });
    t.onTestFinished(() => h.close());
    const diagnostic = vi.spyOn(logger, "info");
    const services = h.daemon.services;
    const shell = await h.daemon.createShell();
    const outside = await h.daemon.createShell();
    const panel = initialHostPanel("host", "network", "demo", ["a"], {
        preset: "auto",
    });
    panel.tabs[0]!.terminalId = shell.id;
    panel.tabs[0]!.presentation = "shell";
    panel.tabs[0]!.agentKey = null;
    await services.db.hostState.createHost(
        {
            id: "host",
            name: "demo",
            directory: h.home,
            sourceFile: join(h.home, "absent.yaml"),
            instruction: "",
            panelId: panel.id,
            networkId: "network",
            revision: 1,
            activeOperationId: null,
            agents: [
                {
                    key: "a",
                    adapter: "codex",
                    role: null,
                    description: null,
                    instruction: "",
                    args: [],
                    member: true,
                    runtime: null,
                    lastTerminalId: null,
                    lastExit: null,
                },
            ],
        },
        {
            id: "network",
            hostId: "host",
            name: "team",
            scope: "host",
            default: "deny",
            members: [{ agentKey: "a", runtimeId: null }],
            edges: [],
        },
        panel,
        Date.now(),
    );
    const request = async (
        method: string,
        path: string,
        requestId = randomUUID(),
    ) => {
        const response = await fetch(h.apiUrl(path), {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ requestId }),
        });
        expect(response.status).toBe(202);
        const operation = (await response.json()) as { id: string };
        expect(diagnostic).toHaveBeenCalledWith(
            expect.objectContaining({
                operationId: operation.id,
                operationRequestId: requestId,
                requestId: response.headers.get("x-request-id"),
            }),
            "Host operation accepted",
        );
        await vi.waitFor(
            async () => {
                expect(
                    (await services.db.hostState.snapshot()).operations.find(
                        (o) => o.id === operation.id,
                    )?.state,
                ).not.toBe("running");
            },
            { timeout: 8000 },
        );
        return (await services.db.hostState.snapshot()).operations.find(
            (o) => o.id === operation.id,
        )!;
    };
    const before = await services.db.hostState.snapshot();
    expect((await request("POST", "/api/hosts/host/stop")).state).toBe(
        "succeeded",
    );
    expect(services.terminals.view(shell.id)?.alive).toBe(true);
    expect((await services.db.hostState.snapshot()).networks).toEqual(
        before.networks,
    );
    const stop = vi
        .spyOn(services.lifecycle, "stopTerminal")
        .mockRejectedValueOnce(new Error("termination refused"));
    const failed = await request("DELETE", "/api/hosts/host");
    expect(failed).toMatchObject({
        state: "failed",
        error: { message: "termination refused" },
    });
    expect((await services.db.hostState.snapshot()).hosts).toHaveLength(1);
    stop.mockRestore();
    const requestId = randomUUID();
    const deleted = await request("DELETE", "/api/hosts/host", requestId);
    expect(deleted.state).toBe("succeeded");
    expect(diagnostic).toHaveBeenCalledWith(
        expect.objectContaining({
            operationId: deleted.id,
            operationRequestId: requestId,
            hostId: "host",
            state: "succeeded",
        }),
        "Host operation finished",
    );
    expect(await services.db.hostState.snapshot()).toMatchObject({
        hosts: [],
        panels: [],
        networks: [],
    });
    expect(services.terminals.view(shell.id)?.alive ?? false).toBe(false);
    expect(services.terminals.view(outside.id)?.alive).toBe(true);
    expect((await request("DELETE", "/api/hosts/host", requestId)).id).toBe(
        deleted.id,
    );
}, 20000);
