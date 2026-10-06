import { useEffect, useEffectEvent, useRef } from "react";
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
import { confirmationTerminals } from "@/features/manage-workspace/close-confirmation";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

import { dropTarget, resizeChanges } from "./workspace-commands";
import { shellSource } from "./workspace-preview";
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
    const handledLocation = useRef<string | null>(null);
    const requestedTabId = (location.state as { focusTabId?: unknown } | null)
        ?.focusTabId;
    const focusTabId =
        typeof requestedTabId === "string" ? requestedTabId : undefined;
    const focusPane =
        handledLocation.current === location.key
            ? undefined
            : panelLayoutReferences(panel.layout).panes.find((pane) =>
                  pane.tabIds.includes(focusTabId ?? ""),
              );
    const layout = selectedLayout(
        panel.layout,
        focusPane
            ? { ...selection?.selectedTabId, [focusPane.id]: focusTabId! }
            : selection?.selectedTabId,
    );
    const workspace = {
        ...panel,
        layout,
        activePaneId:
            focusPane?.id ?? selection?.activePaneId ?? panel.activePaneId,
    };
    const applySelection = useEffectEvent(
        (paneId: string | undefined, tabId: string | undefined) => {
            if (paneId && tabId) select(paneId, tabId);
        },
    );
    useEffect(() => {
        if (handledLocation.current === location.key) return;
        handledLocation.current = location.key;
        applySelection(focusPane?.id, focusTabId);
    }, [location.key, location.state, focusPane?.id, focusTabId]);
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
                onClose={async (tab, confirm) => {
                    const operation = send({
                        panelId: panel.id,
                        changes: [
                            {
                                type: "tab.close",
                                tabId: tab.id,
                                expectedRuntimeId: tab.runtimeId,
                                confirm,
                            },
                        ],
                    });
                    const outcome = await operation.result;
                    if (
                        !confirm &&
                        outcome.status === "rejected" &&
                        confirmationTerminals(outcome.issue)
                    )
                        return true;
                    reportOutcome(operation);
                    return false;
                }}
                onDismiss={(tab) =>
                    command([{ type: "tab.dismiss", tabId: tab.id }])
                }
                addShell={(paneId, axis) => {
                    const tabId = crypto.randomUUID();
                    const sourceTerminalId = shellSource(workspace, paneId);
                    command(
                        [
                            {
                                type: "tab.create",
                                tabId,
                                ...(sourceTerminalId
                                    ? {
                                          source: {
                                              panelId: panel.id,
                                              terminalId: sourceTerminalId,
                                          },
                                      }
                                    : {}),
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
