import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
    panelViewSchema,
    hostViewSchema,
    configViewSchema,
    type PanelView,
    type HostView,
    type WebSnapshot,
} from "@aiox/protocol";
import { expect, it, vi } from "vitest";

import { startTestDaemon } from "./testing";
it("commits workspace panels, rejects stale or injected layout writes and exposes them in the initial SSE snapshot", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const request = async (path: string, method = "GET", body?: unknown) => {
        const response = await fetch(h.apiUrl(path), {
            method,
            ...(body === undefined
                ? {}
                : {
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                  }),
        });
        return { status: response.status, body: await response.json() };
    };
    const created = await request("/api/panels", "POST", {
        name: "  Workspace  ",
        section: "hosts",
    });
    expect(created.status).toBe(201);
    const panel = panelViewSchema.parse(created.body);
    expect(panel).toMatchObject({
        name: "Workspace",
        section: "hosts",
        kind: "workspace",
        revision: 1,
        tabs: [],
    });
    expect(
        (
            await request(`/api/panels/${panel.id}/name`, "PUT", {
                revision: 1,
                name: "Renamed",
            })
        ).status,
    ).toBe(200);
    expect(
        (
            await request(`/api/panels/${panel.id}/name`, "PUT", {
                revision: 1,
                name: "Stale",
            })
        ).status,
    ).toBe(409);
    expect(
        (
            await request(`/api/panels/${panel.id}/layout`, "PUT", {
                revision: 2,
                layout: panel.layout,
                activePaneId: "missing",
            })
        ).status,
    ).toBe(400);
    expect((await request(`/api/panels/${panel.id}`)).body).toMatchObject({
        name: "Renamed",
        revision: 2,
    });
    const response = await fetch(h.webUrl("/api/web/events"));
    const reader = response.body!.getReader();
    const frame = new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    expect(frame).toContain("event: snapshot");
    expect(frame).toContain("Renamed");
    expect((await request("/api/hosts")).body).toEqual([]);
    expect((await request("/api/operations/missing")).status).toBe(404);
});

it("resolves applied Hosts by YAML, preserves management on Copy and returns config conflicts and storage errors", async (t) => {
    const h = await startTestDaemon({
        terminal: async () => ({
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            args: [],
            cwd: h.home,
        }),
    });
    t.onTestFinished(() => h.close());
    const request = async (path: string, method = "GET", body?: unknown) => {
        const response = await fetch(h.apiUrl(path), {
            method,
            ...(body === undefined
                ? {}
                : {
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                  }),
        });
        return { status: response.status, body: await response.json() };
    };
    const terminal = await h.daemon.createShell();
    const panel: PanelView = {
        id: "panel",
        kind: "host",
        section: "hosts",
        name: "Test",
        hostId: "host",
        networkId: "network",
        revision: 1,
        layout: {
            type: "pane",
            id: "pane",
            tabIds: ["tab"],
            selectedTabId: "tab",
        },
        activePaneId: "pane",
        tabs: [
            {
                id: "tab",
                terminalId: terminal.id,
                label: "Reviewer",
                agentKey: "reviewer",
                runtimeId: null,
                presentation: "stopped",
                notice: {
                    message: "Stopped",
                    reason: null,
                    restartCommand: "aiox host agent start reviewer",
                },
            },
        ],
    };
    const host: HostView = {
        id: "host",
        name: "Test",
        directory: h.home,
        sourceFile: join(h.home, "aiox.yaml"),
        instruction: "",
        panelId: "panel",
        networkId: "network",
        revision: 1,
        activeOperationId: null,
        agents: [
            {
                key: "reviewer",
                adapter: "claude",
                role: null,
                description: null,
                instruction: "",
                args: [],
                member: true,
                runtime: null,
                lastTerminalId: terminal.id,
                lastExit: { kind: "stopped", message: null, at: 1 },
            },
        ],
    };
    await h.daemon.services.db.hostState.createHost(
        host,
        {
            id: "network",
            hostId: "host",
            name: "Team",
            scope: "host",
            default: "allow",
            members: [{ agentKey: "reviewer", runtimeId: null }],
            edges: [],
        },
        panel,
        1,
    );
    await writeFile(
        host.sourceFile,
        "host: {name: Test}\nagents:\n  reviewer: {adapter: claude}\nnetworks:\n  Team: {agents: [reviewer]}\n",
    );
    expect(
        (
            await request("/api/hosts/resolve", "POST", {
                source: { directory: h.home },
            })
        ).body,
    ).toEqual({ hostId: "host" });
    expect(await request("/api/hosts/Test")).toMatchObject({
        status: 404,
        body: { code: "unknown_host", stage: "cli" },
    });
    expect((await request("/api/hosts/host/networks/network")).status).toBe(
        200,
    );
    const copied = await request("/api/panels/panel/tabs/tab/dismiss", "POST", {
        revision: 1,
    });
    expect(copied.status).toBe(200);
    expect(panelViewSchema.parse(copied.body).tabs[0]).toMatchObject({
        terminalId: terminal.id,
        agentKey: null,
        runtimeId: null,
        notice: null,
        presentation: "shell",
    });
    expect(
        hostViewSchema.parse((await request("/api/hosts/host")).body).agents,
    ).toEqual(host.agents);
    const config = configViewSchema.parse((await request("/api/config")).body);
    expect(
        (
            await request("/api/config", "PUT", {
                revision: config.revision,
                stored: { appearance: { theme: "dark" } },
            })
        ).status,
    ).toBe(200);
    expect(
        (
            await request("/api/config", "PUT", {
                revision: config.revision,
                stored: {},
            })
        ).status,
    ).toBe(409);
    expect(
        (
            await request("/api/hosts/resolve", "POST", {
                source: { directory: h.home, file: "missing.yaml" },
            })
        ).body,
    ).toMatchObject({ code: "invalid_yaml", stage: "yaml" });
    const failed = vi
        .spyOn(h.daemon.services.db.hostState, "snapshot")
        .mockRejectedValue(new Error("disk unavailable"));
    try {
        expect((await request("/api/panels")).body).toMatchObject({
            code: "storage_error",
        });
    } finally {
        failed.mockRestore();
    }
});

it("reports config file read failures as config-stage invalid_config", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    await mkdir(join(h.home, ".aiox", "config.json"));
    const response = await fetch(h.apiUrl("/api/config"));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
        code: "invalid_config",
        stage: "config",
    });
});

it("streams a large snapshot and subsequent state over a real HTTP connection", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const snapshot: WebSnapshot = {
        hosts: [],
        networks: [],
        panels: [],
        agents: [],
        operations: [],
        notifications: [],
        terminals: Array.from({ length: 1500 }, (_, i) => ({
            id: `terminal-${i}`,
            cwd: h.home,
            kind: "shell",
            alive: true,
        })),
    };
    h.daemon.services.webEvents.setSnapshot(async () => snapshot);
    const response = await fetch(h.webUrl("/api/web/events"));
    const reader = response.body!.getReader();
    t.onTestFinished(() => reader.cancel());
    const decoder = new TextDecoder();
    let buffered = "";
    const frame = async () => {
        while (!buffered.includes("\n\n")) {
            const chunk = await reader.read();
            expect(chunk.done).toBe(false);
            buffered += decoder.decode(chunk.value, { stream: true });
        }
        const end = buffered.indexOf("\n\n");
        const result = buffered.slice(0, end);
        buffered = buffered.slice(end + 2);
        return result;
    };
    const initial = await frame();
    expect(Buffer.byteLength(initial)).toBeGreaterThan(88_589);
    expect(initial.startsWith("event: snapshot\ndata: ")).toBe(true);
    expect(JSON.parse(initial.slice("event: snapshot\ndata: ".length))).toEqual(
        snapshot,
    );
    snapshot.terminals.pop();
    h.daemon.services.webEvents.notify();
    expect(await frame()).toBe(
        'event: state\ndata: {"changes":[{"resource":"terminal","action":"remove","id":"terminal-1499"}]}',
    );
    await reader.cancel();
});
