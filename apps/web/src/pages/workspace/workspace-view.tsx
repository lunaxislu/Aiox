import { type TabView } from "@aiox/protocol";
import { useEffect, useRef, useState } from "react";

import type { PanelPreview } from "@/entities/panel/model";
import type {
    TerminalPreview,
    WorkspaceLayout,
} from "@/entities/panel/workspace-fixtures";
import { panelLayoutReferences } from "@/entities/panel/workspace-layout";
import { Button } from "@/shared/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/shared/ui/dialog";

import { ConnectedTerminal } from "./connected-terminal";
import { PaneTree } from "./pane-tree";
import { TerminalBody } from "./terminal-body";
import { TerminalSurface } from "./terminal-surface";
import { WorkspaceDnd } from "./workspace-dnd";
import {
    addPreviewShell,
    closePreviewTab,
    movePreviewTab,
    selectPreviewTab,
    visibleTerminals,
} from "./workspace-preview";

export type WorkspaceViewProps = {
    panel: Pick<
        PanelPreview,
        "id" | "name" | "kind" | "command" | "layout" | "activePaneId" | "tabs"
    >;
    terminals: Record<string, TerminalPreview>;
    /** 알림 클릭이 지목한 탭. `key`는 같은 탭을 다시 지목한 이동을 구분한다. */
    tabSelectionRequest?: { tabId: string; key: string } | undefined;
};

export function WorkspaceView({
    panel,
    terminals,
    tabSelectionRequest,
}: WorkspaceViewProps) {
    const [state, setState] = useState<WorkspaceLayout>(panel);
    useEffect(() => {
        if (!tabSelectionRequest) return;
        setState((current) => {
            const pane = panelLayoutReferences(current.layout).panes.find(
                (item) => item.tabIds.includes(tabSelectionRequest.tabId),
            );
            return pane
                ? selectPreviewTab(current, pane.id, tabSelectionRequest.tabId)
                : current;
        });
    }, [tabSelectionRequest?.tabId, tabSelectionRequest?.key]);

    function addShell(paneId: string, axis?: "x" | "y") {
        const id = crypto.randomUUID();
        const tab: TabView = {
            id,
            label: "shell",
            terminalId: `terminal-${id}`,
            runtimeId: null,
            agentKey: null,
            presentation: "shell",
            notice: null,
        };
        setState((current) =>
            addPreviewShell(current, paneId, tab, crypto.randomUUID(), axis),
        );
    }

    return (
        <WorkspaceContent
            panel={panel}
            terminals={terminals}
            state={state}
            onSelect={(paneId, tabId) =>
                setState((current) =>
                    tabId
                        ? selectPreviewTab(current, paneId, tabId)
                        : { ...current, activePaneId: paneId },
                )
            }
            onLayoutChange={(layout) =>
                setState((current) => ({ ...current, layout }))
            }
            onDrop={(tabId, target) =>
                setState((current) =>
                    movePreviewTab(current, tabId, target, crypto.randomUUID()),
                )
            }
            addShell={addShell}
            onClose={(tab) =>
                setState((current) => closePreviewTab(current, tab.id))
            }
        />
    );
}

export type WorkspaceActions = {
    onSelect: (paneId: string, tabId?: string) => void;
    onLayoutChange: (layout: WorkspaceLayout["layout"]) => void;
    onDrop: (
        tabId: string,
        target: import("./workspace-preview").TabDrop,
    ) => void;
    addShell: (paneId: string, axis?: "x" | "y") => void;
    onClose: (tab: TabView, confirm: boolean) => void;
    onDismiss?: ((tab: TabView) => void) | undefined;
};
export function WorkspaceContent({
    panel,
    terminals,
    state,
    onSelect,
    onLayoutChange,
    onDrop,
    addShell,
    onClose,
    onDismiss,
    live = false,
}: WorkspaceViewProps &
    WorkspaceActions & { state: WorkspaceLayout; live?: boolean }) {
    const [connections, setConnections] = useState<
        Record<string, TerminalPreview["connection"]>
    >({});
    const [closing, setClosing] = useState<TabView | null>(null);
    const terminalSlots = useRef(new Map<string, HTMLDivElement>());
    const activatePane = (paneId: string) => onSelect(paneId);
    function close(tab: TabView, confirm = false) {
        onClose(tab, confirm);
        setClosing(null);
    }
    function requestClose(tab: TabView, force = false) {
        const pane = panelLayoutReferences(state.layout).panes.find((pane) =>
            pane.tabIds.includes(tab.id),
        );
        if (pane) activatePane(pane.id);
        const terminal = tab.terminalId ? terminals[tab.terminalId] : undefined;
        if (
            !force &&
            (tab.presentation === "preparing" ||
                ["stopped", "start-failed", "crashed", "unavailable"].includes(
                    tab.presentation,
                ) ||
                (!live &&
                    tab.presentation === "shell" &&
                    terminal?.busy === "idle" &&
                    terminal.connection === "connected"))
        )
            close(tab);
        else setClosing(tab);
    }
    return (
        <section
            aria-label={`${panel.name} workspace`}
            className="flex h-full min-h-0 min-w-0 flex-col bg-background"
        >
            <WorkspaceDnd state={state} onDrop={onDrop}>
                <PaneTree
                    terminalSlots={terminalSlots}
                    layout={state.layout}
                    state={state}
                    panel={panel}
                    terminals={terminals}
                    connections={connections}
                    onLayoutChange={onLayoutChange}
                    onSelect={onSelect}
                    onActivate={activatePane}
                    onClose={requestClose}
                    onAdd={addShell}
                    onDismiss={onDismiss}
                />
            </WorkspaceDnd>
            {visibleTerminals(state).map(({ paneId, tab, terminalId }) => (
                <TerminalSurface
                    key={JSON.stringify([terminalId, tab.runtimeId])}
                    slots={terminalSlots}
                    paneId={paneId}
                    terminalId={terminalId}
                    onActivate={() => activatePane(paneId)}
                >
                    {live ? (
                        <ConnectedTerminal
                            tab={tab}
                            terminal={terminals[terminalId]}
                            active={state.activePaneId === paneId}
                            onConnection={(connection) =>
                                setConnections((current) => {
                                    const next = { ...current };
                                    if (connection)
                                        next[
                                            JSON.stringify([
                                                terminalId,
                                                tab.runtimeId,
                                            ])
                                        ] = connection;
                                    else
                                        delete next[
                                            JSON.stringify([
                                                terminalId,
                                                tab.runtimeId,
                                            ])
                                        ];
                                    return next;
                                })
                            }
                            onStop={() => requestClose(tab, true)}
                        />
                    ) : (
                        <TerminalBody
                            tab={tab}
                            terminal={terminals[terminalId]}
                            connection={
                                connections[
                                    JSON.stringify([terminalId, tab.runtimeId])
                                ] ??
                                terminals[terminalId]?.connection ??
                                "connected"
                            }
                            onReconnect={() =>
                                setConnections((current) => ({
                                    ...current,
                                    [JSON.stringify([
                                        terminalId,
                                        tab.runtimeId,
                                    ])]: "connected",
                                }))
                            }
                            onStop={() => requestClose(tab, true)}
                        />
                    )}
                </TerminalSurface>
            ))}
            <Dialog
                open={closing !== null}
                onOpenChange={(open) => {
                    if (!open) setClosing(null);
                }}
            >
                <DialogContent showCloseButton={false}>
                    <DialogTitle>Close and stop {closing?.label}?</DialogTitle>
                    <DialogDescription>
                        Closing stops this terminal. It may still be running.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setClosing(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (closing) close(closing, true);
                            }}
                        >
                            Close and stop
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
