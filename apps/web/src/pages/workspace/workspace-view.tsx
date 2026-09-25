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
    const [connections, setConnections] = useState<
        Record<string, TerminalPreview["connection"]>
    >({});
    const [closing, setClosing] = useState<TabView | null>(null);
    const terminalSlots = useRef(new Map<string, HTMLDivElement>());

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

    function activatePane(paneId: string) {
        setState((current) =>
            current.activePaneId === paneId
                ? current
                : { ...current, activePaneId: paneId },
        );
    }

    function close(tab: TabView) {
        setState((current) => closePreviewTab(current, tab.id));
        setClosing(null);
    }
    function requestClose(tab: TabView, force = false) {
        setState((current) => {
            const pane = panelLayoutReferences(current.layout).panes.find(
                (pane) => pane.tabIds.includes(tab.id),
            );
            return pane && pane.id !== current.activePaneId
                ? { ...current, activePaneId: pane.id }
                : current;
        });
        const terminal = tab.terminalId ? terminals[tab.terminalId] : undefined;
        const connection = tab.terminalId
            ? (connections[tab.terminalId] ?? terminal?.connection)
            : undefined;
        if (
            !force &&
            (tab.presentation === "stopped" ||
                tab.presentation === "start-failed" ||
                tab.presentation === "crashed" ||
                tab.presentation === "unavailable" ||
                (tab.presentation === "shell" &&
                    terminal?.busy === "idle" &&
                    connection === "connected"))
        )
            close(tab);
        else {
            setClosing(tab);
        }
    }
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
        <section
            aria-label={`${panel.name} workspace`}
            className="flex h-full min-h-0 min-w-0 flex-col bg-background"
        >
            <WorkspaceDnd
                state={state}
                onDrop={(tabId, target) => {
                    setState((current) =>
                        movePreviewTab(
                            current,
                            tabId,
                            target,
                            crypto.randomUUID(),
                        ),
                    );
                }}
            >
                <PaneTree
                    terminalSlots={terminalSlots}
                    layout={state.layout}
                    state={state}
                    panel={panel}
                    terminals={terminals}
                    connections={connections}
                    onLayoutChange={(layout) =>
                        setState((current) => ({ ...current, layout }))
                    }
                    onSelect={(paneId, tabId) =>
                        setState((current) =>
                            selectPreviewTab(current, paneId, tabId),
                        )
                    }
                    onActivate={activatePane}
                    onClose={requestClose}
                    onAdd={addShell}
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
                    <TerminalBody
                        tab={tab}
                        terminal={terminals[terminalId]}
                        connection={
                            connections[terminalId] ??
                            terminals[terminalId]?.connection ??
                            "connected"
                        }
                        onReconnect={() =>
                            setConnections((current) => ({
                                ...current,
                                [terminalId]: "connected",
                            }))
                        }
                        onStop={() => requestClose(tab, true)}
                    />
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
                                if (closing) close(closing);
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
