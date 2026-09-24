import { appendFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import { Session } from "node:inspector/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { openDatabase } from "@aiox/persistence";
import {
    hostViewSchema,
    hostNetworkViewSchema,
    panelViewSchema,
    operationSchema,
    webSnapshotSchema,
    type PanelView,
} from "@aiox/protocol";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { expect, it, vi } from "vitest";

import type { RuntimeRecord } from "./runtimes";
import type { DaemonServices } from "./services";
import { changes, WebEvents } from "./web-events";
import { readWebSnapshot, projectHostState } from "./web-state";

// Opt-in, real temporary WAL database. No PTY/vendor processes or production DB.
// AIOX_SCALE=1 pnpm --filter @aiox/daemon test src/web-state.scale.test.ts
// JSONL: AIOX_SCALE_OUTPUT (default /tmp/aiox-web-scale.jsonl), times in ms.
// AIOX_SCALE_HOSTS=200|1 and AIOX_SCALE_NO_SSE=1 narrow a run.
// AIOX_SCALE_COUNT=1 counts flush entry with an inspector conditional breakpoint;
// run it separately because debugger instrumentation changes latency.
// SQL/JSON/Zod spies are limited to breakdown samples. joinAndOrm is the residual,
// including Drizzle materialization and instrumentation overhead, not pure join time.
// Empty operations/notifications/persistent networks; short text, synthetic live runtimes.
// SSE latency ends after every localhost HTTP client receives a complete state frame.
const percentile = (values: number[], p: number) =>
    [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * p))
    ]!;
const summary = (values: number[]) => ({
    p50: +percentile(values, 0.5).toFixed(3),
    p95: +percentile(values, 0.95).toFixed(3),
});
async function measure(run: () => unknown | Promise<unknown>, count = 40) {
    for (let i = 0; i < 5; i++) await run();
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
        const start = performance.now();
        await run();
        times.push(performance.now() - start);
    }
    return summary(times);
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

it.skipIf(!process.env.AIOX_SCALE)(
    "measures 200 agents, 200 panels, 800 tabs with distributed and concentrated membership",
    async () => {
        const directory = await mkdtemp(join(tmpdir(), "aiox-scale-"));
        try {
            for (const hostCount of process.env.AIOX_SCALE_HOSTS
                ? [Number(process.env.AIOX_SCALE_HOSTS)]
                : [200, 1]) {
                const db = await openDatabase(
                    join(directory, `${hostCount}.db`),
                );
                const panels: PanelView[] = [];
                const runtimes: RuntimeRecord[] = [];
                try {
                    for (let i = 0; i < 200; i++) {
                        const hostId = i < hostCount ? `h${i}` : null;
                        const networkId = hostId === null ? null : `n${i}`;
                        const tabs = Array.from({ length: 4 }, (_, j) => ({
                            id: `tab${i}-${j}`,
                            terminalId: `t${i}-${j}`,
                            label: `Shell ${j}`,
                            agentKey: hostId && j === 0 ? `a${i}` : null,
                            runtimeId: null,
                            presentation: "shell" as const,
                            notice: null,
                        }));
                        const panel: PanelView = {
                            id: `p${i}`,
                            kind: hostId ? "host" : "workspace",
                            section: "hosts",
                            name: `Panel ${i}`,
                            hostId,
                            networkId,
                            revision: 1,
                            layout: {
                                type: "pane",
                                id: `pane${i}`,
                                tabIds: tabs.map((t) => t.id),
                                selectedTabId: tabs[0]!.id,
                            },
                            activePaneId: `pane${i}`,
                            tabs,
                        };
                        panels.push(panel);
                        if (hostId && networkId) {
                            const keys = Array.from(
                                { length: 200 / hostCount },
                                (_, k) => `a${i + k}`,
                            );
                            await db.hostState.createHost(
                                {
                                    id: hostId,
                                    name: hostId,
                                    directory: "/tmp",
                                    sourceFile: "/tmp/aiox.yaml",
                                    instruction: "",
                                    revision: 1,
                                    panelId: panel.id,
                                    networkId,
                                    activeOperationId: null,
                                    agents: keys.map((key) => ({
                                        key,
                                        adapter: "claude",
                                        role: null,
                                        description: null,
                                        instruction: "",
                                        args: [],
                                        member: true,
                                        runtime: null,
                                        lastTerminalId: null,
                                        lastExit: null,
                                    })),
                                },
                                {
                                    id: networkId,
                                    hostId,
                                    name: networkId,
                                    scope: "host",
                                    default: "allow",
                                    members: keys.map((agentKey) => ({
                                        agentKey,
                                        runtimeId: null,
                                    })),
                                    edges: keys.flatMap((from) =>
                                        keys
                                            .filter((to) => to !== from)
                                            .map((to) => ({
                                                from,
                                                to,
                                                fromRuntimeId: null,
                                                toRuntimeId: null,
                                                policy: "allow" as const,
                                                source: "manifest-default" as const,
                                            })),
                                    ),
                                },
                                panel,
                                i,
                            );
                            for (const key of keys)
                                runtimes.push({
                                    id: `r${key}`,
                                    name: key,
                                    role: null,
                                    description: null,
                                    networkId,
                                    hostId,
                                    executionOwnership: "daemon",
                                    collaborationActive: true,
                                    terminalId: `t${Number(key.slice(1))}-0`,
                                    terminalOwnership: "owned",
                                    phase: "running",
                                    status: "idle",
                                    status_reason: null,
                                    observation_error: null,
                                    binding: {
                                        deliver: async () => {},
                                        stop: async () => {},
                                    },
                                });
                        } else await db.hostState.createPanel(panel);
                    }
                    const terminals = panels.flatMap((p) =>
                        p.tabs.map((t) => ({
                            id: t.terminalId!,
                            kind: "shell" as const,
                            cwd: "/tmp",
                            alive: true,
                        })),
                    );
                    const services = {
                        db,
                        networks: db.networks,
                        runtimes: {
                            list: () => runtimes,
                            get: (id: string) =>
                                runtimes.find((r) => r.id === id),
                        },
                        terminals: {
                            views: () => terminals,
                            view: (id: string) =>
                                terminals.find((t) => t.id === id),
                        },
                    } as unknown as DaemonServices;
                    const before = await readWebSnapshot(services);
                    expect(before.agents).toHaveLength(200);
                    expect(before.panels).toHaveLength(200);
                    const snapshot = await measure(() =>
                        db.hostState.snapshot(),
                    );
                    const web = await measure(() => readWebSnapshot(services));
                    const stored = await db.hostState.snapshot();
                    const projection = await measure(() =>
                        projectHostState(stored, services),
                    );
                    const webValidation = await measure(() =>
                        webSnapshotSchema.parse(before),
                    );

                    // Instrument only the breakdown run; end-to-end timings above/below have no spies.
                    let sqlMs = 0,
                        zodMs = 0,
                        jsonMs = 0;
                    const persistenceRequire = createRequire(
                        new URL(
                            "../../../packages/persistence/package.json",
                            import.meta.url,
                        ),
                    );
                    const Database = persistenceRequire("better-sqlite3");
                    const probe = new Database(":memory:");
                    const statement = Object.getPrototypeOf(
                        probe.prepare("select 1"),
                    );
                    const all = statement.all;
                    const sqlSpy = vi
                        .spyOn(statement, "all")
                        .mockImplementation(function (
                            this: unknown,
                            ...args: unknown[]
                        ) {
                            const start = performance.now();
                            try {
                                return all.apply(this, args);
                            } finally {
                                sqlMs += performance.now() - start;
                            }
                        });
                    const schemaSpies = [
                        hostViewSchema,
                        hostNetworkViewSchema,
                        panelViewSchema,
                        operationSchema,
                    ].map((schema: { parse: (data: unknown) => unknown }) => {
                        const parse = schema.parse.bind(schema);
                        return vi
                            .spyOn(schema, "parse")
                            .mockImplementation(
                                (...args: Parameters<typeof parse>) => {
                                    const start = performance.now();
                                    try {
                                        return parse(...args);
                                    } finally {
                                        zodMs += performance.now() - start;
                                    }
                                },
                            );
                    });
                    const parse = JSON.parse;
                    const jsonSpy = vi
                        .spyOn(JSON, "parse")
                        .mockImplementation((...args) => {
                            const start = performance.now();
                            try {
                                return parse(...args);
                            } finally {
                                jsonMs += performance.now() - start;
                            }
                        });
                    let total = 0;
                    try {
                        for (let i = 0; i < 20; i++) {
                            const start = performance.now();
                            await db.hostState.snapshot();
                            total += performance.now() - start;
                        }
                    } finally {
                        sqlSpy.mockRestore();
                        jsonSpy.mockRestore();
                        schemaSpies.forEach((s) => s.mockRestore());
                        probe.close();
                    }
                    const breakdown = {
                        sqlite: sqlMs / 20,
                        zod: zodMs / 20,
                        json: jsonMs / 20,
                        joinAndOrm: (total - sqlMs - zodMs - jsonMs) / 20,
                    };
                    runtimes[0]!.status = "working";
                    const after = await readWebSnapshot(services);
                    const diff1 = await measure(() => changes(before, after));
                    const diff4 = await measure(() => {
                        for (let i = 0; i < 4; i++) changes(before, after);
                    });
                    const writes: number[] = [];
                    for (let i = 0; i < 200; i++) {
                        const panel = panels[i]!;
                        const ids = panel.tabs.map((t) => t.id).reverse();
                        const start = performance.now();
                        await db.hostState.updatePanel(
                            {
                                ...panel,
                                revision: 2,
                                layout: {
                                    type: "split",
                                    axis: "x",
                                    weights: [0.5, 0.5],
                                    children: [
                                        {
                                            type: "pane",
                                            id: panel.activePaneId!,
                                            tabIds: ids.slice(1),
                                            selectedTabId: ids[1]!,
                                        },
                                        {
                                            type: "pane",
                                            id: `moved${i}`,
                                            tabIds: [ids[0]!],
                                            selectedTabId: ids[0]!,
                                        },
                                    ],
                                },
                            },
                            1,
                        );
                        writes.push(performance.now() - start);
                    }
                    const additions: number[] = [],
                        removals: number[] = [];
                    for (const panel of (await db.hostState.snapshot())
                        .panels) {
                        const layout = panel.layout;
                        if (
                            layout.type !== "split" ||
                            layout.children[0]?.type !== "pane"
                        )
                            throw new Error("Missing moved pane");
                        const extra = {
                            id: `extra-${panel.id}`,
                            terminalId: `extra-terminal-${panel.id}`,
                            label: "New shell",
                            agentKey: null,
                            runtimeId: null,
                            presentation: "shell" as const,
                            notice: null,
                        };
                        const start = performance.now();
                        await db.hostState.updatePanel(
                            {
                                ...panel,
                                revision: panel.revision + 1,
                                tabs: [...panel.tabs, extra],
                                layout: {
                                    ...layout,
                                    children: [
                                        {
                                            ...layout.children[0],
                                            tabIds: [
                                                ...layout.children[0].tabIds,
                                                extra.id,
                                            ],
                                        },
                                        ...layout.children.slice(1),
                                    ],
                                },
                            },
                            panel.revision,
                        );
                        additions.push(performance.now() - start);
                        const removalStart = performance.now();
                        await db.hostState.updatePanel(
                            { ...panel, revision: panel.revision + 2 },
                            panel.revision + 1,
                        );
                        removals.push(performance.now() - removalStart);
                    }
                    expect(
                        (await db.hostState.snapshot()).panels.every(
                            (p) => p.revision === 4 && p.tabs.length === 4,
                        ),
                    ).toBe(true);
                    const sse = [];
                    for (const clients of process.env.AIOX_SCALE_NO_SSE
                        ? []
                        : [1, 4]) {
                        const events = new WebEvents();
                        let reads = 0;
                        events.setSnapshot(async () => {
                            reads++;
                            return readWebSnapshot(services);
                        });
                        const app = new Hono();
                        app.get("/events", (c) => events.connect(c));
                        const server = serve({
                            fetch: app.fetch,
                            hostname: "127.0.0.1",
                            port: 0,
                        });
                        await new Promise<void>((resolve, reject) => {
                            server.once("listening", resolve);
                            server.once("error", reject);
                        });
                        const address = server.address() as { port: number };
                        const readers: ReadableStreamDefaultReader<Uint8Array>[] =
                            [];
                        const nextEvents: (() => Promise<string>)[] = [];
                        const coverage = new Session();
                        const scripts: {
                            scriptId: string;
                            url: string;
                            executionContextId: number;
                        }[] = [];
                        let countedScript: (typeof scripts)[number] | undefined;
                        if (process.env.AIOX_SCALE_COUNT) {
                            coverage.connect();
                            coverage.on("Debugger.scriptParsed", ({ params }) =>
                                scripts.push(params),
                            );
                            await coverage.post("Debugger.enable");
                            countedScript = scripts.find((s) =>
                                s.url.endsWith("/web-events.ts"),
                            );
                            if (!countedScript)
                                throw new Error(
                                    "WebEvents script was not found",
                                );
                            const { scriptSource } = await coverage.post(
                                "Debugger.getScriptSource",
                                { scriptId: countedScript.scriptId },
                            );
                            const entry =
                                scriptSource.indexOf("async #flush() {");
                            if (entry < 0)
                                throw new Error("flush entry was not found");
                            const lineNumber = scriptSource
                                .slice(0, entry)
                                .split("\n").length;
                            await coverage.post("Debugger.setBreakpoint", {
                                location: {
                                    scriptId: countedScript.scriptId,
                                    lineNumber,
                                },
                                condition:
                                    "globalThis.__aioxScaleFlush = (globalThis.__aioxScaleFlush ?? 0) + 1, false",
                            });
                        }
                        try {
                            for (let i = 0; i < clients; i++) {
                                const response = await fetch(
                                    `http://127.0.0.1:${address.port}/events`,
                                );
                                const reader = response.body!.getReader();
                                readers.push(reader);
                                let buffer = "";
                                const decoder = new TextDecoder();
                                const nextEvent = async () => {
                                    while (!buffer.includes("\n\n")) {
                                        const chunk = await reader.read();
                                        if (chunk.done)
                                            throw new Error("SSE closed");
                                        buffer += decoder.decode(chunk.value, {
                                            stream: true,
                                        });
                                    }
                                    const end = buffer.indexOf("\n\n") + 2;
                                    const event = buffer.slice(0, end);
                                    buffer = buffer.slice(end);
                                    return event;
                                };
                                nextEvents.push(nextEvent);
                                expect(await nextEvent()).toContain(
                                    "event: snapshot",
                                );
                            }
                            await tick();
                            reads = 0;
                            if (countedScript)
                                await coverage.post("Runtime.evaluate", {
                                    expression:
                                        "globalThis.__aioxScaleFlush = 0",
                                    contextId: countedScript.executionContextId,
                                });
                            const latencies: number[] = [];
                            // Five transitions of every agent, as 200-agent synchronous bursts.
                            const states = [
                                "aiox-preparing",
                                "idle",
                                "working",
                                "awaiting-user",
                                "failed",
                            ] as const;
                            for (let round = 0; round < 5; round++)
                                for (const status of states) {
                                    const start = performance.now();
                                    const received = nextEvents.map(
                                        async (next) => {
                                            expect(await next()).toContain(
                                                "event: state",
                                            );
                                        },
                                    );
                                    for (const runtime of runtimes) {
                                        runtime.status = status;
                                        events.notify();
                                    }
                                    await Promise.all(received);
                                    latencies.push(performance.now() - start);
                                    await tick();
                                }
                            const flushCalls = countedScript
                                ? ((
                                      await coverage.post("Runtime.evaluate", {
                                          expression:
                                              "globalThis.__aioxScaleFlush",
                                          contextId:
                                              countedScript.executionContextId,
                                      })
                                  ).result.value as number)
                                : null;
                            sse.push({
                                clients,
                                flushCalls,
                                externalNotify: 5000,
                                snapshotReads: reads,
                                notifyToAllReadersMs: summary(latencies),
                            });
                        } finally {
                            if (countedScript) coverage.disconnect();
                            events.close();
                            await Promise.all(readers.map((r) => r.cancel()));
                            (server as Server).closeAllConnections();
                            await new Promise<void>((resolve, reject) =>
                                server.close((error) =>
                                    error ? reject(error) : resolve(),
                                ),
                            );
                        }
                    }
                    appendFileSync(
                        process.env.AIOX_SCALE_OUTPUT ??
                            "/tmp/aiox-web-scale.jsonl",
                        JSON.stringify({
                            hostCount,
                            agents: 200,
                            panels: 200,
                            tabs: 800,
                            edges: before.networks.reduce(
                                (n, network) =>
                                    n +
                                    ("edges" in network
                                        ? network.edges.length
                                        : 0),
                                0,
                            ),
                            snapshot,
                            web,
                            projection,
                            webValidation,
                            breakdown,
                            diff1,
                            diff4,
                            snapshotBytes: Buffer.byteLength(
                                `event: snapshot\ndata: ${JSON.stringify(before)}\n\n`,
                            ),
                            writes: summary(writes),
                            additions: summary(additions),
                            removals: summary(removals),
                            writesTotalMs: writes.reduce((a, b) => a + b, 0),
                            sse,
                        }) + "\n",
                    );
                } finally {
                    await db.close();
                }
            }
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    },
    120_000,
);
