import { useEffect, useEffectEvent } from "react";
import { useLocation, useOutletContext, useParams } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import {
    useApplicationState,
    usePanelCommand,
    usePanelSelection,
} from "@/app/application-state";
import { selectedLayout } from "@/entities/panel/application-panels";
import { isSection, type PanelPreview } from "@/entities/panel/model";
import type { TerminalPreview } from "@/entities/panel/workspace-fixtures";
import { panelLayoutReferences } from "@/entities/panel/workspace-layout";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

import { dropTarget, resizeChanges } from "./workspace-commands";
import { WorkspaceContent } from "./workspace-view";
export function WorkspacePage() {
    const { panels } = useOutletContext<AppOutletContext>();
    const { section, panelId } = useParams();
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );
    if (!isSection(section) || !panel) return <NotFoundPage />;
    return <ConnectedWorkspace key={panel.id} panel={panel} />;
}
function ConnectedWorkspace({ panel }: { panel: PanelPreview }) {
    const state = useApplicationState();
    const send = usePanelCommand();
    const { selection, select } = usePanelSelection(panel.id);
    const location = useLocation();
    const { reportOutcome } = useOutletContext<AppOutletContext>();
    const layout = selectedLayout(panel.layout, selection?.selectedTabId);
    const workspace = {
        ...panel,
        layout,
        activePaneId: selection?.activePaneId ?? panel.activePaneId,
    };
    const applySelection = useEffectEvent(
        (tabId: string | undefined | null) => {
            if (!tabId) return;
            const pane = panelLayoutReferences(layout).panes.find((pane) =>
                pane.tabIds.includes(tabId),
            );
            if (pane) {
                select(pane.id, tabId);
            }
        },
    );
    useEffect(() => {
        applySelection(
            (location.state as { focusTabId?: string } | null)?.focusTabId,
        );
    }, [location.key, location.state]);
    const terminals: Record<string, TerminalPreview> = Object.fromEntries(
        state.terminals.map((terminal) => {
            const agent = state.agents.find(
                (agent) => agent.terminalId === terminal.id,
            );
            return [
                terminal.id,
                {
                    cwd: terminal.cwd,
                    output: "",
                    connection: "disconnected",
                    busy: "unknown",
                    ...(agent
                        ? {
                              status: agent.status,
                              ...(agent.status_reason
                                  ? { statusReason: agent.status_reason }
                                  : {}),
                          }
                        : {}),
                },
            ];
        }),
    );
    const command = (
        changes: Parameters<typeof send>[0]["changes"],
        focus?: string,
    ) => {
        const operation = send({ panelId: panel.id, changes });
        reportOutcome(operation);
        if (focus) {
            const change = changes.find(
                (change) =>
                    change.type === "tab.create" || change.type === "tab.move",
            );
            if (
                change &&
                (change.type === "tab.create" || change.type === "tab.move")
            )
                select(
                    "split" in change.target
                        ? change.target.split.paneId
                        : change.target.toPaneId,
                    focus,
                );
        }
    };
    return (
        <>
            <WorkspaceContent
                panel={workspace}
                state={workspace}
                terminals={terminals}
                live
                onSelect={select}
                onClose={(tab, confirm) =>
                    command([
                        {
                            type: "tab.close",
                            tabId: tab.id,
                            expectedRuntimeId: tab.runtimeId,
                            confirm,
                        },
                    ])
                }
                onDismiss={(tab) =>
                    command([{ type: "tab.dismiss", tabId: tab.id }])
                }
                addShell={(paneId, axis) => {
                    const tabId = crypto.randomUUID();
                    command(
                        [
                            {
                                type: "tab.create",
                                tabId,
                                target: axis
                                    ? {
                                          split: {
                                              targetPaneId: paneId,
                                              side:
                                                  axis === "x"
                                                      ? "right"
                                                      : "bottom",
                                              paneId: crypto.randomUUID(),
                                              splitId: crypto.randomUUID(),
                                          },
                                      }
                                    : { toPaneId: paneId },
                            },
                        ],
                        tabId,
                    );
                }}
                onDrop={(tabId, drop) => {
                    const target = dropTarget(layout, tabId, drop);
                    if (target)
                        command([{ type: "tab.move", tabId, target }], tabId);
                }}
                onLayoutChange={(next) => {
                    const changes = resizeChanges(layout, next);
                    if (changes.length) command(changes);
                }}
            />
        </>
    );
}
