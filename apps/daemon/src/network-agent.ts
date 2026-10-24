import { randomUUID } from "node:crypto";

import { HostStateError } from "@aiox/persistence";
import {
    insertPanelTab,
    panelLayoutReferences,
    type AgentRun,
} from "@aiox/protocol";
import { Effect, Fiber } from "effect";

import type { DaemonServices } from "./services";

/** Returns false when the caller already occupies the target Network panel. */
export async function launchInNetwork(
    services: DaemonServices,
    input: AgentRun,
    networkId: string,
): Promise<boolean> {
    const caller = services.terminals.authenticateContext(
        input.terminalContext!,
    );
    const panel = await services.db.hostState.getPanel(networkId);
    if (!panel || panel.kind !== "network" || panel.networkId !== networkId)
        throw new Error("Network panel is unavailable.");
    const existing = panel.tabs.find((tab) => tab.terminalId === caller.id);
    if (existing) {
        await services.appState.reveal(caller.id, panel.id, existing.id);
        return false;
    }
    // Once admitted, this launch belongs to the daemon, not the source CLI socket.
    const task = await Effect.runPromise(
        services.tasks.start(
            Effect.tryPromise({
                try: () => launch(services, input, networkId),
                catch: (error) => error,
            }),
        ),
    );
    await Effect.runPromise(Fiber.join(task));
    return true;
}

function restartCommand(input: AgentRun, networkId: string): string {
    const options = {
        network: networkId,
        name: input.name,
        role: input.role,
        description: input.description,
        instruction: input.instruction,
    };
    const args = [
        "aiox",
        "agent",
        "run",
        input.adapter,
        ...Object.entries(options).flatMap(([key, value]) =>
            value === undefined ? [] : [`--${key}`, value],
        ),
        "--",
        ...input.args,
    ];
    const command = args
        .map((value) => `'${value.replaceAll("'", "'\\''")}'`)
        .join(" ");
    return command;
}

async function launch(
    services: DaemonServices,
    input: AgentRun,
    panelId: string,
): Promise<void> {
    const tabId = randomUUID();
    let terminalId: string | undefined;
    let joined = false;
    try {
        await services.db.hostState.mutatePanel(panelId, (p) => {
            const panes = panelLayoutReferences(p.layout).panes;
            const pane = panes[p.tabs.length % panes.length]!;
            return {
                ...p,
                ...insertPanelTab(p, tabId, { toPaneId: pane.id }),
                tabs: [
                    ...p.tabs,
                    {
                        id: tabId,
                        terminalId: null,
                        runtimeId: null,
                        agentKey: null,
                        label: "Shell",
                        presentation: "preparing",
                        notice: null,
                    },
                ],
            };
        });
        await services.appState.update({ panel: panelId });
        await services.appState.reveal(
            input.terminalContext!.terminalId,
            panelId,
            tabId,
        );
        const terminal = await services.lifecycle.createShell({
            cwd: input.cwd,
            cols: input.cols,
            rows: input.rows,
        });
        terminalId = terminal.id;
        if (!terminal.alive)
            throw new Error("Network shell exited during creation.");
        await services.db.hostState.mutatePanel(panelId, (p) => {
            if (
                !p.tabs.some(
                    (tab) =>
                        tab.id === tabId &&
                        tab.presentation === "preparing" &&
                        tab.terminalId === null,
                )
            )
                throw new Error("The Agent tab was closed during preparation.");
            return {
                ...p,
                tabs: p.tabs.map((tab) =>
                    tab.id === tabId
                        ? {
                              ...tab,
                              terminalId: terminal.id,
                              presentation: "shell" as const,
                          }
                        : tab,
                ),
            };
        });
        joined = true;
        await services.appState.update({ panel: panelId });
        await services.lifecycle.startAgent({
            ...input,
            network: panelId,
            terminalContext: services.terminals.context(terminal.id),
            env: Object.fromEntries(
                Object.entries(input.env).filter(
                    ([key]) => !key.toUpperCase().startsWith("AIOX_"),
                ),
            ),
        });
    } catch (error) {
        if (terminalId && !joined)
            await services.cleanups.track({
                terminalId,
                panelId,
                tabId,
                reason: "shell-unjoined",
            });
        // A running vendor remains owned by its execution owner, even on readiness failure.
        if (
            !terminalId ||
            !services.runtimes
                .list()
                .some(
                    (r) =>
                        r.terminalId === terminalId &&
                        r.binding.terminal?.alive,
                )
        ) {
            await services.db.hostState
                .mutatePanel(panelId, (p) => ({
                    ...p,
                    tabs: p.tabs.map((tab) =>
                        tab.id === tabId
                            ? {
                                  ...tab,
                                  presentation: "start-failed" as const,
                                  notice: {
                                      message:
                                          error instanceof Error
                                              ? error.message
                                              : String(error),
                                      reason: "launch_failed",
                                      restartCommand: restartCommand(
                                          input,
                                          panelId,
                                      ),
                                  },
                              }
                            : tab,
                    ),
                }))
                .catch((storage: unknown) => {
                    if (
                        storage instanceof HostStateError &&
                        (storage.code === "unknown_panel" ||
                            storage.code === "id_deleted")
                    )
                        return;
                    throw new AggregateError(
                        [error, storage],
                        "Agent launch failed and its failure state could not be saved.",
                    );
                });
            await services.appState.update({ panel: panelId });
        }
        throw error;
    }
}
