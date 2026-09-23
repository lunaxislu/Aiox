import { panelViewSchema, operationSchema } from "@aiox/protocol";
import { expect, it, vi } from "vitest";

import { startTestDaemon } from "./testing";
it("panel shell commands return durable Operations, deduplicate retries and close confirmed resources", async (t) => {
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
    const panel = panelViewSchema.parse(
        (await request("/api/panels", "POST", { name: "Shells" })).body,
    );
    const input = {
        requestId: "6a8ed620-0000-4000-8000-000000000010",
        revision: 1,
        paneId: panel.activePaneId,
    };
    const accepted = await request(
        `/api/panels/${panel.id}/shells`,
        "POST",
        input,
    );
    expect(accepted.status).toBe(202);
    const operation = operationSchema.parse(accepted.body);
    await vi.waitFor(
        async () =>
            expect(
                operationSchema.parse(
                    (await request(`/api/operations/${operation.id}`)).body,
                ).state,
            ).toBe("succeeded"),
        { timeout: 5000 },
    );
    expect(
        operationSchema.parse(
            (await request(`/api/panels/${panel.id}/shells`, "POST", input))
                .body,
        ).id,
    ).toBe(operation.id);
    const updated = panelViewSchema.parse(
        (await request(`/api/panels/${panel.id}`)).body,
    );
    expect(updated.tabs).toHaveLength(1);
    expect(
        (
            await request(`/api/panels/${panel.id}/shells`, "POST", {
                ...input,
                paneId: "different",
            })
        ).status,
    ).toBe(409);
    const deniedId = "6a8ed620-0000-4000-8000-000000000012";
    expect(
        (
            await request(
                `/api/panels/${panel.id}/tabs/${updated.tabs[0]!.id}`,
                "DELETE",
                {
                    requestId: deniedId,
                    revision: updated.revision,
                    expectedRuntimeId: null,
                    confirm: false,
                },
            )
        ).status,
    ).toBe(409);
    expect(
        (await request(`/api/operations?requestId=${deniedId}`)).body,
    ).toEqual([]);
    const closing = await request(
        `/api/panels/${panel.id}/tabs/${updated.tabs[0]!.id}`,
        "DELETE",
        {
            requestId: "6a8ed620-0000-4000-8000-000000000011",
            revision: updated.revision,
            expectedRuntimeId: null,
            confirm: true,
        },
    );
    expect(closing.status).toBe(202);
    const close = operationSchema.parse(closing.body);
    await vi.waitFor(
        async () =>
            expect(
                operationSchema.parse(
                    (await request(`/api/operations/${close.id}`)).body,
                ).state,
            ).toBe("succeeded"),
        { timeout: 5000 },
    );
    expect(
        panelViewSchema.parse((await request(`/api/panels/${panel.id}`)).body)
            .tabs,
    ).toEqual([]);
    expect(
        operationSchema.parse(
            (await request(`/api/operations/${close.id}`)).body,
        ).targets[0]!.state,
    ).toBe("stopped");
    const empty = panelViewSchema.parse(
        (await request(`/api/panels/${panel.id}`)).body,
    );
    const second = operationSchema.parse(
        (
            await request(`/api/panels/${panel.id}/shells`, "POST", {
                requestId: "6a8ed620-0000-4000-8000-000000000013",
                revision: empty.revision,
                paneId: empty.activePaneId,
            })
        ).body,
    );
    await vi.waitFor(async () =>
        expect(
            operationSchema.parse(
                (await request(`/api/operations/${second.id}`)).body,
            ).state,
        ).toBe("succeeded"),
    );
    const running = panelViewSchema.parse(
        (await request(`/api/panels/${panel.id}`)).body,
    );
    h.daemon.services.terminals
        .get(running.tabs[0]!.terminalId!)!
        .write("exit\r");
    await vi.waitFor(
        async () =>
            expect(
                panelViewSchema.parse(
                    (await request(`/api/panels/${panel.id}`)).body,
                ).tabs,
            ).toEqual([]),
        { timeout: 5000 },
    );
    const final = panelViewSchema.parse(
        (await request(`/api/panels/${panel.id}`)).body,
    );
    const deleting = operationSchema.parse(
        (
            await request(`/api/panels/${panel.id}`, "DELETE", {
                requestId: "6a8ed620-0000-4000-8000-000000000014",
                revision: final.revision,
                confirm: true,
            })
        ).body,
    );
    await vi.waitFor(async () =>
        expect(
            operationSchema.parse(
                (await request(`/api/operations/${deleting.id}`)).body,
            ).state,
        ).toBe("succeeded"),
    );
    expect((await request(`/api/panels/${panel.id}`)).status).toBe(404);
});

it("close reconciles latest layout once, preserves failed terminals and permits a new retry", async (t) => {
    const h = await startTestDaemon({
        terminal: async () => ({
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            args: [],
            cwd: h.home,
        }),
    });
    t.onTestFinished(() => h.close());
    const services = h.daemon.services;
    const terminal = await services.lifecycle.createShell({ cwd: h.home });
    const pane = (
        id: string,
        tabIds: string[],
        selectedTabId = tabIds[0] ?? null,
    ) => ({ type: "pane" as const, id, tabIds, selectedTabId });
    const panel = panelViewSchema.parse({
        id: "close-layout",
        kind: "workspace",
        section: "workspaces",
        name: "Close",
        hostId: null,
        networkId: null,
        revision: 1,
        activePaneId: "closing",
        layout: {
            type: "split",
            axis: "x",
            weights: [0.2, 0.3, 0.5],
            children: [
                pane("previous", ["previous-tab"]),
                {
                    type: "split",
                    axis: "y",
                    weights: [0.4, 0.6],
                    children: [
                        pane("closing", ["closing-tab"]),
                        pane("next", ["next-tab", "selected"], "selected"),
                    ],
                },
                pane("last", ["last-tab"]),
            ],
        },
        // DTO tab order deliberately differs from layout order.
        tabs: [
            "last-tab",
            "closing-tab",
            "selected",
            "previous-tab",
            "next-tab",
        ].map((id) => ({
            id,
            terminalId: id === "closing-tab" ? terminal.id : null,
            agentKey: null,
            runtimeId: null,
            label: id,
            presentation: "shell",
            notice: null,
        })),
    });
    await services.db.hostState.createPanel(panel);
    const read = async () =>
        panelViewSchema.parse(
            await (await fetch(h.apiUrl(`/api/panels/${panel.id}`))).json(),
        );
    const stored = await read();
    const input = {
        requestId: "6a8ed620-0000-4000-8000-000000000020",
        revision: 1,
        expectedRuntimeId: null,
        confirm: true,
    };
    const close = (body: unknown) =>
        fetch(h.apiUrl(`/api/panels/${panel.id}/tabs/closing-tab`), {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    const finish = async (id: string) => {
        const readOperation = async () =>
            operationSchema.parse(
                await (await fetch(h.apiUrl(`/api/operations/${id}`))).json(),
            );
        await vi.waitFor(
            async () =>
                expect((await readOperation()).state).not.toBe("running"),
            { timeout: 5000 },
        );
        return readOperation();
    };
    for (const change of [
        { revision: 2 },
        { expectedRuntimeId: "wrong-runtime" },
    ])
        expect((await close({ ...input, ...change })).status).toBe(409);
    const kill = vi
        .spyOn(services.terminals.get(terminal.id)!, "kill")
        .mockRejectedValueOnce(new Error("termination unconfirmed"));
    const response = await close(input);
    expect(response.status).toBe(202);
    const accepted = operationSchema.parse(await response.json());
    expect(accepted.state).toBe("running");
    const failed = await finish(accepted.id);
    expect(failed.state).toBe("failed");
    expect(failed.error).toMatchObject({
        code: "execution_failed",
        message: "termination unconfirmed",
        stage: "execution",
    });
    expect(failed.cleanupErrors).toEqual([
        expect.objectContaining({
            message: "termination unconfirmed",
            stage: "cleanup",
        }),
    ]);
    expect(await read()).toEqual(stored);
    expect(services.terminals.view(terminal.id)?.alive).toBe(true);
    expect(operationSchema.parse(await (await close(input)).json()).id).toBe(
        accepted.id,
    );
    expect(kill).toHaveBeenCalledTimes(1);
    // Change children order while the stop awaits confirmation. Cleanup must use it.
    kill.mockRestore();
    const session = services.terminals.get(terminal.id)!;
    const realKill = session.kill.bind(session);
    vi.spyOn(session, "kill").mockImplementationOnce(async () => {
        const current = await read();
        if (current.layout.type !== "split") throw new Error("expected split");
        const nested = current.layout.children[1]!;
        if (nested.type !== "split") throw new Error("expected nested split");
        nested.children.reverse();
        nested.weights.reverse();
        current.layout.children.reverse();
        current.layout.weights.reverse();
        await services.db.hostState.updatePanel(
            { ...current, revision: current.revision + 1 },
            current.revision,
        );
        return realKill();
    });
    const retried = operationSchema.parse(
        await (
            await close({
                ...input,
                requestId: "6a8ed620-0000-4000-8000-000000000021",
            })
        ).json(),
    );
    expect((await finish(retried.id)).state).toBe("succeeded");
    await Promise.all(services.operationTasks);
    const remaining = await read();
    expect(remaining.revision).toBe(3);
    expect(remaining.activePaneId).toBe("previous");
    expect(remaining.layout).toEqual({
        type: "split",
        axis: "x",
        weights: [0.5, 0.3, 0.2],
        children: [
            pane("last", ["last-tab"]),
            pane("next", ["next-tab", "selected"], "selected"),
            pane("previous", ["previous-tab"]),
        ],
    });
    expect(remaining.tabs.map((tab) => tab.id)).not.toContain("closing-tab");
    expect(services.terminals.view(terminal.id)).toBeUndefined();
    // No terminal exists: the API's fallback removal must use the same rules.
    const fallback = await fetch(
        h.apiUrl(`/api/panels/${panel.id}/tabs/last-tab`),
        {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                ...input,
                revision: remaining.revision,
                requestId: "6a8ed620-0000-4000-8000-000000000022",
            }),
        },
    );
    expect(
        (await finish(operationSchema.parse(await fallback.json()).id)).state,
    ).toBe("succeeded");
    const final = await read();
    expect(final.activePaneId).toBe("previous");
    expect(final.layout).toEqual({
        type: "split",
        axis: "x",
        weights: [0.6, 0.4],
        children: [
            pane("next", ["next-tab", "selected"], "selected"),
            pane("previous", ["previous-tab"]),
        ],
    });
});
