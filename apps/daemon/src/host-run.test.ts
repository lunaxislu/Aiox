import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { saveConfig } from "@aiox/config";
import {
    operationSchema,
    panelLayoutReferences,
    type HostLayout,
} from "@aiox/protocol";
import type {
    VendorAdapter,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { expect, test, vi } from "vitest";

import { initialHostPanel, launcher } from "./host-run";
import { startTestDaemon } from "./testing";

test.each([
    [{ preset: "auto" }, 1, [["a"]]],
    [{ preset: "auto" }, 2, [["a"], ["b"]]],
    [{ preset: "auto" }, 3, [["a"], ["b"], ["c"]]],
    [{ preset: "auto" }, 6, [["a", "e"], ["b", "f"], ["c"], ["d"]]],
    [{ preset: "left-main" }, 4, [["a", "d"], ["b"], ["c"]]],
    [{ preset: "top-main" }, 2, [["a"], ["b"]]],
    [
        { preset: "grid", columns: 2, rows: 1 },
        6,
        [
            ["a", "c", "e"],
            ["b", "d", "f"],
        ],
    ],
    [{ preset: "grid", columns: 1000000, rows: 1000000 }, 2, [["a"], ["b"]]],
] as [HostLayout, number, string[][]][])(
    "initial layout %j with %i Agents",
    (layout, count, expected) => {
        const panel = initialHostPanel(
            "h",
            "n",
            "Host",
            "abcdef".slice(0, count).split(""),
            layout,
        );
        const { panes } = panelLayoutReferences(panel.layout);
        expect(
            panes.map((p) =>
                p.tabIds.map(
                    (id) => panel.tabs.find((t) => t.id === id)!.agentKey,
                ),
            ),
        ).toEqual(expected);
        expect(panes.every((p) => p.selectedTabId === p.tabIds[0])).toBe(true);
        expect(panel.activePaneId).toBe(panes[0]!.id);
        if (count === 3 && layout.preset === "auto") {
            expect(panel.layout).toMatchObject({
                type: "split",
                axis: "x",
                children: [{ type: "pane" }, { type: "split", axis: "y" }],
            });
        }
    },
);

test("run rejects invalid YAML before creating an Operation or Host", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close(), 30000);
    await writeFile(join(h.home, "aiox.yaml"), "host: []");
    const response = await fetch(h.apiUrl("/api/hosts/run"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            requestId: randomUUID(),
            source: { directory: h.home },
        }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ stage: "yaml" });
    const state = await h.daemon.services.db.hostState.snapshot();
    expect(state.hosts).toEqual([]);
    expect(state.operations).toEqual([]);
});

test.skipIf(process.platform === "win32")(
    "run uses real shells and CLI, persists ready targets, deduplicates and isolates Networks",
    async (t) => {
        const launches: VendorLaunchInput[] = [];
        const adapter: VendorAdapter = {
            id: "codex",
            async createExecution() {
                return {
                    connection: null,
                    async start(command, owner) {
                        return owner.foreground(
                            command as Parameters<typeof owner.foreground>[0],
                        );
                    },
                };
            },
            createBinding(controls) {
                let ready = false;
                const binding: VendorBinding = {
                    get wasReady() {
                        return ready;
                    },
                    onReady: undefined,
                    onReleased: undefined,
                    async prepare(input) {
                        launches.push(input);
                        if (input.args.includes("--fail"))
                            throw new Error("intentional preparation failure");
                        return {
                            file: process.execPath,
                            cwd: input.cwd,
                            env: {
                                ...input.env,
                                TEST_REPORT_URL: input.reportUrl,
                                TEST_REPORT_TOKEN: input.reportToken,
                            },
                            args: [
                                "--input-type=module",
                                "-e",
                                `
                        const response = await fetch(process.env.TEST_REPORT_URL, {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + process.env.TEST_REPORT_TOKEN}, body: '{}'});
                        if (!response.ok) throw new Error(await response.text());
                        process.stdout.write('VENDOR_READY\\n');
                        process.stdin.on('data', () => process.exit(0));
                    `,
                            ],
                        };
                    },
                    async observe() {
                        ready = true;
                        controls.setStatus("idle");
                        binding.onReady?.();
                    },
                    executionStarted() {},
                    async processExited() {},
                    mcpConnected() {},
                    async connectionLost() {},
                    async cleanup() {},
                    async deliver() {},
                };
                return binding;
            },
        };

        const h = await startTestDaemon({
            adapters: [adapter],
            terminal: async () => ({
                shell: "/bin/bash",
                args: ["--noprofile", "--norc"],
                cwd: h.home,
            }),
        });
        t.onTestFinished(() => h.close(), 30000);
        await saveConfig(
            {
                ports: h.daemon.ports,
                terminal: {
                    shell: "/bin/bash",
                    args: ["--noprofile", "--norc"],
                },
            },
            { home: h.home },
        );
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: demo}
agents:
  alpha: {adapter: codex}
  beta: {adapter: codex}
networks:
  shared: {agents: [alpha, beta], routing: {default: deny}}
`,
        );
        await h.daemon.services.networks.create("shared");
        const input = {
            requestId: randomUUID(),
            source: { directory: h.home },
        };
        const post = (body: unknown) =>
            fetch(h.apiUrl("/api/hosts/run"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
        const response = await post(input);
        expect(response.status).toBe(202);
        const operation = operationSchema.parse(await response.json());
        await vi.waitFor(
            async () => {
                const saved = (await h.daemon.services.db.hostState.snapshot())
                    .operations[0]!;
                expect(saved).toMatchObject({
                    state: "succeeded",
                    targets: [{ state: "ready" }, { state: "ready" }],
                });
            },
            { timeout: 15000 },
        );
        const state = await h.daemon.services.db.hostState.snapshot();
        expect(state.hosts).toHaveLength(1);
        expect(state.panels[0]!.tabs.every((t) => t.terminalId)).toBe(true);
        expect(
            h.daemon.services.runtimes.list().map((r) => r.networkId),
        ).toEqual([state.networks[0]!.id, state.networks[0]!.id]);
        expect((await h.daemon.services.networks.list())[0]!.id).not.toBe(
            state.networks[0]!.id,
        );
        expect(operationSchema.parse(await (await post(input)).json()).id).toBe(
            operation.id,
        );
        expect(
            (await post({ ...input, layout: { preset: "left-main" } })).status,
        ).toBe(409);
        expect((await post({ ...input, requestId: randomUUID() })).status).toBe(
            409,
        );
        expect(launches).toHaveLength(2);
        const effective = await h.daemon.services.networks.effective(
            state.networks[0]!.id,
        );
        expect(effective.defaultPolicy).toBe("deny");
        expect(effective.routes).toHaveLength(2);
        expect(
            effective.routes.every(
                (r) =>
                    h.daemon.services.runtimes.get(r.from)?.hostId ===
                        state.hosts[0]!.id &&
                    h.daemon.services.runtimes.get(r.to)?.hostId ===
                        state.hosts[0]!.id,
            ),
        ).toBe(true);
        const restart = () =>
            fetch(h.apiUrl("/api/hosts/restart"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    requestId: randomUUID(),
                    source: input.source,
                }),
            });
        const beforeInvalid = await h.daemon.services.db.hostState.snapshot();
        const runtimeIds = h.daemon.services.runtimes.list().map((r) => r.id);
        await writeFile(join(h.home, "aiox.yaml"), "host: []");
        expect((await restart()).status).toBe(400);
        expect(await h.daemon.services.db.hostState.snapshot()).toEqual(
            beforeInvalid,
        );
        expect(h.daemon.services.runtimes.list().map((r) => r.id)).toEqual(
            runtimeIds,
        );
        const userShell = await h.daemon.createShell();
        const customized = structuredClone(beforeInvalid.panels[0]!);
        const panes = panelLayoutReferences(customized.layout).panes;
        panes[0]!.tabIds.push("user-tab");
        customized.tabs.push({
            id: "user-tab",
            terminalId: userShell.id,
            agentKey: "beta",
            runtimeId: null,
            label: "User shell",
            presentation: "shell",
            notice: null,
        });
        await h.daemon.services.db.hostState.updatePanel(
            { ...customized, revision: customized.revision + 1 },
            customized.revision,
        );
        const oldAlpha = customized.tabs.find(
            (tab) => tab.agentKey === "alpha",
        )!;
        const oldBeta = customized.tabs.find((tab) => tab.agentKey === "beta")!;
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: demo, instruction: latest}\nagents:\n  alpha: {adapter: codex}\n  gamma: {adapter: codex}\nnetworks:\n  replaced: {agents: [alpha, gamma], routing: {default: allow}}\n",
        );
        const terminate = vi
            .spyOn(h.daemon.services.lifecycle, "stopTerminal")
            .mockRejectedValueOnce(new Error("removed shell still alive"));
        const rejectedRestart = operationSchema.parse(
            await (await restart()).json(),
        );
        await vi.waitFor(
            async () => {
                const failed = await h.daemon.services.db.hostState.snapshot();
                expect(
                    failed.operations.find((o) => o.id === rejectedRestart.id),
                ).toMatchObject({
                    state: "failed",
                    error: {
                        stage: "execution",
                        message: "removed shell still alive",
                    },
                });
                expect(failed.hosts[0]!.agents.map((a) => a.key)).toEqual([
                    "alpha",
                    "beta",
                ]);
                expect(
                    h.daemon.services.terminals.view(oldBeta.terminalId!)
                        ?.alive,
                ).toBe(true);
            },
            { timeout: 10000 },
        );
        terminate.mockRestore();
        const restarting = await restart();
        expect(restarting.status).toBe(202);
        const restartOperation = operationSchema.parse(await restarting.json());
        await vi.waitFor(
            async () => {
                const latest = await h.daemon.services.db.hostState.snapshot();
                expect(
                    latest.operations.find((o) => o.id === restartOperation.id)
                        ?.state,
                ).toBe("succeeded");
            },
            { timeout: 15000 },
        );
        const replaced = await h.daemon.services.db.hostState.snapshot();
        expect(replaced.hosts[0]).toMatchObject({
            id: state.hosts[0]!.id,
            instruction: "latest",
        });
        expect(replaced.hosts[0]!.agents.map((a) => a.key)).toEqual([
            "alpha",
            "gamma",
        ]);
        expect(replaced.networks[0]).toMatchObject({
            id: state.networks[0]!.id,
            name: "replaced",
            default: "allow",
        });
        expect(
            replaced.networks[0]!.edges.every(
                (edge) =>
                    edge.source === "manifest-default" &&
                    edge.policy === "allow",
            ),
        ).toBe(true);
        expect(
            replaced.panels[0]!.tabs.find((tab) => tab.agentKey === "alpha"),
        ).toMatchObject({ id: oldAlpha.id, terminalId: oldAlpha.terminalId });
        expect(
            replaced.panels[0]!.tabs.some((tab) => tab.id === oldBeta.id),
        ).toBe(false);
        expect(
            h.daemon.services.terminals.view(oldBeta.terminalId!)?.alive ??
                false,
        ).toBe(false);
        expect(h.daemon.services.terminals.view(userShell.id)?.alive).toBe(
            true,
        );
        expect(
            panelLayoutReferences(replaced.panels[0]!.layout).panes.map(
                (p) => p.id,
            ),
        ).toEqual([panes[0]!.id]);
        expect(replaced.panels[0]!.activePaneId).toBe(panes[0]!.id);
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: partial}
agents:
  alpha: {adapter: codex}
  broken: {adapter: codex, args: [--fail]}
networks:
  shared: {agents: [alpha, broken], routing: {default: allow}}
`,
        );
        const partial = operationSchema.parse(await (await restart()).json());
        await vi.waitFor(
            async () => {
                const state = await h.daemon.services.db.hostState.snapshot();
                expect(
                    state.operations.find((o) => o.id === partial.id),
                ).toMatchObject({
                    state: "failed",
                    targets: [{ state: "ready" }, { state: "failed" }],
                });
                expect(
                    state.panels
                        .find((p) => p.hostId === partial.hostId)!
                        .tabs.find((t) => t.agentKey === "broken")!.notice
                        ?.message,
                ).toContain("intentional preparation failure");
                expect(
                    state.hosts
                        .find((h) => h.id === partial.hostId)!
                        .agents.find((a) => a.key === "broken")!.lastExit?.kind,
                ).toBe("start-failed");
            },
            { timeout: 10000 },
        );
        expect(
            h.daemon.services.runtimes.list().filter((r) => r.name === "alpha"),
        ).toHaveLength(2);
        await writeFile(
            join(h.home, "aiox.yaml"),
            `host: {name: cli-entry}
agents:
  alpha: {adapter: codex}
networks:
  shared: {agents: [alpha]}
`,
        );
        const cli = await promisify(execFile)(
            process.execPath,
            [
                resolve("../cli/dist/main.js"),
                "host",
                "restart",
                "--path",
                h.home,
            ],
            { env: { ...process.env, HOME: h.home }, timeout: 15000 },
        );
        expect(cli.stdout).toContain("Host restart succeeded");
        expect(cli.stdout).toContain("alpha: ready");
        expect(cli.stderr).toBe("");
        const cliHost = (
            await h.daemon.services.db.hostState.snapshot()
        ).hosts.find((host) => host.name === "cli-entry")!;
        const cliRuntime = h.daemon.services.runtimes
            .list()
            .find((runtime) => runtime.hostId === cliHost.id)!;
        await rm(join(h.home, "aiox.yaml"));
        const control = (verb: string) =>
            promisify(execFile)(
                process.execPath,
                [resolve("../cli/dist/main.js"), "host", verb, "cli-entry"],
                { env: { ...process.env, HOME: h.home }, timeout: 15000 },
            );
        expect((await control("stop")).stdout).toContain("Host stop succeeded");
        expect(h.daemon.services.runtimes.get(cliRuntime.id)).toBeUndefined();
        expect(
            h.daemon.services.terminals.view(cliRuntime.terminalId!)?.alive,
        ).toBe(true);
        expect((await control("status")).stdout).toContain("alpha: stopped");
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: cli-entry}\nagents: {alpha: {adapter: codex}}\nnetworks: {shared: {agents: [alpha]}}\n",
        );
        const callerScript = join(h.home, "restart-caller.cjs");
        await writeFile(
            callerScript,
            `import(${JSON.stringify(launcher.href)}).then(async ({createFoundationPort})=>{try{await createFoundationPort({home:${JSON.stringify(h.home)}}).execute({command:'host.restart',args:[],options:{path:${JSON.stringify(h.home)}}});console.log('RESTART_CALLER_DONE');}catch(e){console.error('RESTART_CALLER_FAILED',e.message);process.exitCode=1;}});`,
        );
        const caller = h.daemon.services.terminals.get(cliRuntime.terminalId!)!;
        let callerOutput = "";
        const unsubscribe = caller.subscribe({
            data: (data) => {
                callerOutput += Buffer.from(data).toString();
            },
            exit: () => {},
        });
        t.onTestFinished(unsubscribe);
        caller.write(
            `${JSON.stringify(process.execPath)} ${JSON.stringify(callerScript)}\r`,
        );
        await vi.waitFor(
            () => {
                const current = h.daemon.services.runtimes
                    .list()
                    .find((runtime) => runtime.hostId === cliHost.id);
                expect(current?.phase).toBe("running");
                expect(current?.id).not.toBe(cliRuntime.id);
                expect(current?.terminalId).toBe(cliRuntime.terminalId);
            },
            { timeout: 15000 },
        );
        expect((await control("stop")).stdout).toContain("Host stop succeeded");
        await vi.waitFor(
            () => expect(callerOutput).toContain("RESTART_CALLER_DONE"),
            { timeout: 10000 },
        );
        expect(callerOutput).not.toContain("RESTART_CALLER_FAILED");
        expect((await control("delete")).stdout).toContain(
            "Host delete succeeded",
        );
        const afterDelete = await h.daemon.services.db.hostState.snapshot();
        expect(afterDelete.hosts.some((host) => host.id === cliHost.id)).toBe(
            false,
        );
        expect(afterDelete.hosts.map((host) => host.name).sort()).toEqual([
            "demo",
            "partial",
        ]);
        expect(h.daemon.services.terminals.view(userShell.id)?.alive).toBe(
            true,
        );
    },
    60000,
);

test("invalid caller context creates nothing; shell failure is retained on the declared tab", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    await writeFile(
        join(h.home, "aiox.yaml"),
        "host: {name: failure}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
    );
    const post = (body: unknown) =>
        fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    const source = { directory: h.home };
    const invalid = await post({
        requestId: randomUUID(),
        source,
        terminalContext: { terminalId: "missing", token: "invalid" },
    });
    expect(invalid.status).toBe(400);
    expect((await h.daemon.services.db.hostState.snapshot()).hosts).toEqual([]);
    vi.spyOn(h.daemon.services.lifecycle, "createShell").mockRejectedValue(
        new Error("shell launch failed"),
    );
    const accepted = await post({ requestId: randomUUID(), source });
    expect(accepted.status).toBe(202);
    await vi.waitFor(async () => {
        const state = await h.daemon.services.db.hostState.snapshot();
        expect(state.operations[0]).toMatchObject({
            state: "failed",
            targets: [
                { state: "failed", error: { message: "shell launch failed" } },
            ],
        });
        expect(state.hosts[0]!.agents[0]!.lastExit?.message).toBe(
            "shell launch failed",
        );
        expect(state.panels[0]!.tabs[0]!.notice?.message).toBe(
            "shell launch failed",
        );
    });
    expect(h.daemon.services.terminals.list()).toHaveLength(0);
    expect((await post({ requestId: randomUUID(), source })).status).toBe(409);
});

test.skipIf(process.platform === "win32")(
    "CLI failure before Runtime registration reaches the Operation and tab",
    async (t) => {
        const h = await startTestDaemon();
        t.onTestFinished(() => h.close(), 15000);
        await saveConfig(
            {
                ports: h.daemon.ports,
                terminal: {
                    shell: "/bin/bash",
                    args: ["--noprofile", "--norc"],
                },
            },
            { home: h.home },
        );
        await writeFile(
            join(h.home, "aiox.yaml"),
            "host: {name: launch-error}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
        );
        const create = h.daemon.services.lifecycle.createShell;
        vi.spyOn(
            h.daemon.services.lifecycle,
            "createShell",
        ).mockImplementationOnce(async (...args) => {
            const terminal = await create(...args);
            // The server validated input, but the foreground CLI now encounters a changed config.
            await writeFile(join(h.home, ".aiox", "config.json"), "{bad");
            return terminal;
        });
        const response = await fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                requestId: randomUUID(),
                source: { directory: h.home },
            }),
        });
        expect(response.status).toBe(202);
        await vi.waitFor(
            async () => {
                const state = await h.daemon.services.db.hostState.snapshot();
                expect(state.operations[0]!.state).toBe("failed");
                expect(
                    state.operations[0]!.targets[0]!.error?.message,
                ).toContain("Invalid JSON");
                expect(state.panels[0]!.tabs[0]!.notice?.message).toContain(
                    "Invalid JSON",
                );
            },
            { timeout: 5000 },
        );
        expect(h.daemon.services.runtimes.list()).toEqual([]);
        expect(h.daemon.services.terminals.list()[0]!.alive).toBe(true);
    },
    10000,
);

test.each([
    { stage: "config", status: 500, code: "invalid_config" },
    { stage: "yaml", status: 400, code: "invalid_yaml" },
    { stage: "cli", status: 400, code: "invalid_request" },
])(
    "HTTP run reports $stage before later layout validation",
    async ({ stage, status, code }) => {
        const h = await startTestDaemon();
        try {
            if (stage === "config")
                await writeFile(join(h.home, ".aiox", "config.json"), "{bad");
            if (stage === "cli")
                await writeFile(
                    join(h.home, "aiox.yaml"),
                    "host: {name: validation}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n",
                );
            const create = vi.spyOn(h.daemon.services.lifecycle, "createShell");
            const response = await fetch(h.apiUrl("/api/hosts/run"), {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    requestId: randomUUID(),
                    source: { directory: h.home },
                    layout: { preset: "grid" },
                }),
            });
            expect(response.status).toBe(status);
            expect(await response.json()).toMatchObject({ code, stage });
            expect(
                await h.daemon.services.db.hostState.snapshot(),
            ).toMatchObject({
                hosts: [],
                panels: [],
                networks: [],
                operations: [],
            });
            expect(create).not.toHaveBeenCalled();
        } finally {
            await h.close();
        }
    },
);

test("run distinguishes the same YAML from another source with the same Host name", async (t) => {
    const h = await startTestDaemon();
    t.onTestFinished(() => h.close());
    const yaml =
        "host: {name: duplicate}\nagents: {a: {adapter: codex}}\nnetworks: {n: {agents: [a]}}\n";
    await writeFile(join(h.home, "aiox.one.yaml"), yaml);
    await writeFile(join(h.home, "aiox.two.yaml"), yaml);
    vi.spyOn(h.daemon.services.lifecycle, "createShell").mockRejectedValue(
        new Error("test shell unavailable"),
    );
    const post = (file: string) =>
        fetch(h.apiUrl("/api/hosts/run"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                requestId: randomUUID(),
                source: { directory: h.home, file },
            }),
        });
    expect((await post("aiox.one.yaml")).status).toBe(202);
    await vi.waitFor(async () =>
        expect(
            (await h.daemon.services.db.hostState.snapshot()).operations[0]!
                .state,
        ).toBe("failed"),
    );
    const before = await h.daemon.services.db.hostState.snapshot();
    const repeated = await post("./aiox.one.yaml");
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({
        code: "host_exists",
        stage: "cli",
    });
    const conflict = await post("aiox.two.yaml");
    expect(conflict.status).toBe(409);
    const error = await conflict.json();
    expect(error).toMatchObject({ code: "host_name_conflict", stage: "cli" });
    expect(JSON.stringify(error)).toContain("aiox.one.yaml");
    expect(JSON.stringify(error)).toContain("aiox.two.yaml");
    expect(await h.daemon.services.db.hostState.snapshot()).toEqual(before);
});
