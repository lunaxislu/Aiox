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
