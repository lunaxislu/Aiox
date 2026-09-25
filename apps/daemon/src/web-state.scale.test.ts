import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { openDatabase } from "@aiox/persistence";
import type { PanelView } from "@aiox/protocol";
import { expect, it, vi } from "vitest";

import { AppState } from "./app-state";
import { RuntimeRegistry } from "./runtimes";

// Opt-in, real temporary WAL database; no PTY or vendor processes.
// AIOX_SCALE=1 pnpm --filter @aiox/daemon test src/web-state.scale.test.ts
// Times are milliseconds on this machine; they are measurements, not limits.
const percentile = (values: number[], p: number) =>
    [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * p))
    ]!;

it.skipIf(!process.env.AIOX_SCALE)(
    "measures targeted updates against 200 Host panels with 800 tabs",
    async () => {
        const directory = await mkdtemp(join(tmpdir(), "aiox-scale-"));
        const db = await openDatabase(join(directory, "scale.db"));
        try {
            for (let i = 0; i < 200; i++) {
                const tabs = Array.from({ length: 4 }, (_, j) => ({
                    id: `tab${i}-${j}`,
                    terminalId: `t${i}-${j}`,
                    label: `Shell ${j}`,
                    agentKey: j === 0 ? `a${i}` : null,
                    runtimeId: null,
                    presentation: "shell" as const,
                    notice: null,
                }));
                const panel: PanelView = {
                    id: `p${i}`,
                    kind: "host",
                    section: "hosts",
                    name: `Panel ${i}`,
                    hostId: `h${i}`,
                    networkId: `n${i}`,
                    revision: 1,
                    layout: {
                        type: "pane",
                        id: `pane${i}`,
                        tabIds: tabs.map((t) => t.id),
                    },
                    tabs,
                };
                await db.hostState.createHost(
                    {
                        id: `h${i}`,
                        name: `h${i}`,
                        directory: "/tmp",
                        sourceFile: "/tmp/aiox.yaml",
                        instruction: "",
                        revision: 1,
                        panelId: panel.id,
                        networkId: `n${i}`,
                        agents: [
                            {
                                key: `a${i}`,
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
                        id: `n${i}`,
                        hostId: `h${i}`,
                        name: "team",
                        scope: "host",
                        default: "allow",
                        members: [{ agentKey: `a${i}`, runtimeId: null }],
                        edges: [],
                    },
                    panel,
                    i,
                );
            }
            const state = new AppState({
                db,
                runtimes: new RuntimeRegistry(),
                terminals: { view: () => undefined, views: () => [] },
                cleanups: { view: () => undefined, list: () => [] },
            });
            let started = performance.now();
            await state.rebuild();
            const rebuild = performance.now() - started;
            const scan = vi.spyOn(db.hostState, "snapshot");
            const updates: number[] = [];
            for (let n = 0; n < 200; n++) {
                const id = `p${n}`;
                await db.hostState.mutatePanel(id, (p) => ({
                    ...p,
                    name: `Renamed ${n}`,
                }));
                started = performance.now();
                await state.update({ panel: id });
                updates.push(performance.now() - started);
            }
            started = performance.now();
            const snapshot = JSON.stringify(state.snapshot());
            const serialize = performance.now() - started;
            expect(scan).not.toHaveBeenCalled();
            expect(state.snapshot().panels).toHaveLength(200);
            console.log(
                JSON.stringify({
                    rebuild: rebuild.toFixed(1),
                    updateP50: percentile(updates, 0.5).toFixed(3),
                    updateP95: percentile(updates, 0.95).toFixed(3),
                    snapshotSerialize: serialize.toFixed(1),
                    snapshotBytes: snapshot.length,
                }),
            );
            state.close();
        } finally {
            await db.close();
            await rm(directory, { recursive: true, force: true });
        }
    },
    60000,
);
