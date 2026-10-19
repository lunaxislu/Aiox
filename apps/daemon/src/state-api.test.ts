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
import { Effect } from "effect";
import { expect, it, vi } from "vitest";

import { openTestApplication, startTestDaemon } from "./testing";
it("commits workspace panel commands, rejects stale or unknown targets and exposes them in the initial RPC snapshot", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    let sequence = 0;
    const session = Effect.runSync(
        h.daemon.services.sequencer.open,
    ).clientSessionId;
    const command = (changes: unknown[], extra: object = {}) => ({
        clientSessionId: session,
        sequence: ++sequence,
        requestId: `6a8ed620-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
        panelId: "workspace",
        changes,
        ...extra,
    });
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
        // Asserted field by field below.
        const json: any = await response.json();
        return { status: response.status, body: json };
    };
    const send = (body: object) => request("/api/web/commands", "POST", body);
    const create = {
        type: "panel.create",
        name: "  Workspace  ",
        paneId: "pane",
        tabId: "tab",
    };
    // The Web creates workspace panels only; choosing a section is rejected.
    const sectioned = await send(command([{ ...create, section: "hosts" }]));
    expect(sectioned.status).toBe(400);
    expect(sectioned.body.code).toBe("invalid_request");
    sequence--; // A request rejected at decoding never takes its sequence.
    const created = await send(command([create]));
    expect(created.status).toBe(200);
    const panel = panelViewSchema.parse(created.body.panel);
    expect(panel).toMatchObject({
        id: "workspace",
        name: "Workspace",
        section: "workspaces",
        kind: "workspace",
        revision: 1,
        tabs: [{ id: "tab", presentation: "preparing" }],
    });
    const rename = command([{ type: "panel.rename", name: "Renamed" }]);
    expect((await send(rename)).status).toBe(200);
    // Commands carry no revision; a later rename applies to the latest panel.
    expect(
        (await send(command([{ type: "panel.rename", name: "Later" }]))).body
            .panel,
    ).toMatchObject({ name: "Later" });
    // Replaying the first rename after a lost response is not applied again.
    expect((await send(rename)).body.code).toBe("result_expired");
    expect((await request("/api/panels/workspace")).body.name).toBe("Later");
    expect(
        (
            await send({
                ...rename,
                changes: [{ type: "panel.rename", name: "Other" }],
            })
        ).body.code,
    ).toBe("result_expired");
    for (const [change, code] of [
        [
            {
                type: "tab.move",
                tabId: "missing",
                target: { toPaneId: "pane" },
            },
            "unknown_tab",
        ],
        [
            {
                type: "split.resize",
                splitId: "missing",
                children: ["a", "b"],
                weights: [0.5, 0.5],
            },
            "unknown_split",
        ],
    ] as const)
        expect((await send(command([change]))).body.code).toBe(code);
    // A failed change rejects the whole command: nothing of it is stored.
    expect(
        (
            await send(
                command([
                    { type: "panel.rename", name: "Half" },
                    {
                        type: "tab.move",
                        tabId: "tab",
                        target: { toPaneId: "missing" },
                    },
                ]),
            )
        ).body.code,
    ).toBe("unknown_pane");
    expect(
        (
            await send(
                command([{ type: "panel.rename", name: "Stale" }], {
                    revision: 3,
                }),
            )
        ).status,
    ).toBe(400);
    expect((await request("/api/panels/workspace")).body.name).toBe("Later");
    const rpc = await openTestApplication(h);
    const initial = await rpc.next();
    expect(initial).toMatchObject({
        type: "snapshot",
        snapshot: { panels: [expect.objectContaining({ name: "Later" })] },
    });
    await rpc.close();
    expect((await request("/api/hosts")).body).toEqual([]);
    // Operations are no longer a public resource.
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
        },
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
    // Seeded directly in storage: announce it as a producer would.
    await h.daemon.services.appState.update(
        { host: "host" },
        { panel: "panel" },
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
    const copied = await request("/api/web/commands", "POST", {
        clientSessionId: Effect.runSync(h.daemon.services.sequencer.open)
            .clientSessionId,
        sequence: 1,
        requestId: "6a8ed620-0000-4000-8000-000000000099",
        panelId: "panel",
        changes: [{ type: "tab.dismiss", tabId: "tab" }],
    });
    expect(copied.status).toBe(200);
    expect(
        panelViewSchema.parse((copied.body as { panel: unknown }).panel)
            .tabs[0],
    ).toMatchObject({
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
    // A failed state update is not served as a stale or empty list.
    const failed = vi
        .spyOn(h.daemon.services.db.hostState, "snapshot")
        .mockRejectedValue(new Error("disk unavailable"));
    vi.spyOn(h.daemon.services.db.hostState, "getPanel").mockRejectedValueOnce(
        new Error("disk unavailable"),
    );
    await h.daemon.services.appState.update({ panel: "panel" });
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

it("streams a large snapshot and subsequent state over a real RPC WebSocket", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const state = h.daemon.services.appState;
    for (let i = 0; i < 1500; i++)
        await state.update({
            notification: {
                id: `notice-${i}`,
                originRuntimeId: "runtime",
                terminalId: null,
                body: "x".repeat(40),
                createdAt: i,
                readAt: null,
            },
        });
    const snapshot: WebSnapshot = state.snapshot();
    const rpc = await openTestApplication(h);
    t.onTestFinished(() => rpc.close());
    const initial = await rpc.next();
    expect(Buffer.byteLength(JSON.stringify(initial))).toBeGreaterThan(88_589);
    expect(initial).toMatchObject({ type: "snapshot", snapshot });
    await state.update({ notificationsRead: ["notice-1499"] });
    expect(await rpc.next()).toMatchObject({
        type: "delta",
        changes: [
            { resource: "notification", action: "remove", id: "notice-1499" },
        ],
    });
    await rpc.close();
});
