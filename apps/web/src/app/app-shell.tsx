import type { WebNotificationView } from "@aiox/protocol";
import { Effect, Exit, Cause } from "effect";
import {
    useEffect,
    useEffectEvent,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { Outlet, useNavigate, useParams } from "react-router";

import { agentName, findRuntimeTab } from "@/entities/notification/model";
import {
    applicationPanels,
    selectedLayout,
} from "@/entities/panel/application-panels";
import {
    isSection,
    panelPath,
    sectionLabels,
    type PanelPreview,
    type Section,
} from "@/entities/panel/model";
import { panelLayoutReferences } from "@/entities/panel/workspace-layout";
import { confirmationTerminals } from "@/features/manage-workspace/close-confirmation";
import {
    WorkspaceDialog,
    type WorkspaceAction,
} from "@/features/manage-workspace/workspace-dialog";
import { AppHeader } from "@/widgets/header/app-header";

import { AppLayout } from "./app-layout";
import {
    useApplicationConnection,
    useApplicationConnectionState,
} from "./application-provider";
import {
    useApplicationState,
    useApplicationStore,
    usePanelCommand,
    usePanelSelection,
} from "./application-state";
import { CommandFeedback, useCommandFeedback } from "./command-feedback";
import { ConnectionLost } from "./connection-lost";
export type AppOutletContext = {
    reportOutcome: ReturnType<typeof useCommandFeedback>["reportOutcome"];
    panels: PanelPreview[];
    onCreate: (section: Section) => void;
};
export function AppShell() {
    const state = useApplicationState();
    const panels = applicationPanels(state);
    const connection = useApplicationConnection()!;
    const connectionState = useApplicationConnectionState();
    const send = usePanelCommand();
    const feedback = useCommandFeedback();
    const [action, setAction] = useState<WorkspaceAction | null>(null);
    const deleteRequest = useRef(0);
    function openAction(next: WorkspaceAction | null) {
        deleteRequest.current++;
        setAction(next);
    }
    const [readError, setReadError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { section, panelId } = useParams();
    const store = useApplicationStore();
    const { selection } = usePanelSelection(panelId ?? "");
    const reveal = useEffectEvent(
        (event: {
            sourceTerminalId: string;
            panelId: string;
            tabId: string;
        }) => {
            const current = store.getView().panels;
            const source = current.find((p) => p.id === panelId);
            // Only a window displaying the invoking shell follows its CLI action.
            const sourceTab = source?.tabs.find(
                (tab) => tab.terminalId === event.sourceTerminalId,
            );
            if (
                !sourceTab ||
                !Object.values(selection?.selectedTabId ?? {}).includes(
                    sourceTab.id,
                )
            )
                return;
            const target = current.find((p) => p.id === event.panelId);
            if (!target?.tabs.some((tab) => tab.id === event.tabId)) return;
            void navigate(`/${target.section}/${target.id}`, {
                state: { focusTabId: event.tabId },
            });
        },
    );
    useEffect(() => store.subscribeReveal((event) => reveal(event)), [store]);
    const currentPanel = useRef({ section, panelId });
    useLayoutEffect(() => {
        currentPanel.current = { section, panelId };
    }, [section, panelId]);
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );
    const title =
        panel?.name ??
        (isSection(section) && !panelId ? sectionLabels[section] : "");
    function submit(name: string) {
        if (!action) return;
        const sourceTabId =
            panel &&
            panelLayoutReferences(
                selectedLayout(panel.layout, selection?.selectedTabId),
            ).panes.find(
                (pane) =>
                    pane.id === (selection?.activePaneId ?? panel.activePaneId),
            )?.selectedTabId;
        const sourceTerminalId = panel?.tabs.find(
            (tab) => tab.id === sourceTabId,
        )?.terminalId;
        const id =
            action.type === "create" ? crypto.randomUUID() : action.panel.id;
        const changes =
            action.type === "create"
                ? [
                      {
                          type: "panel.create" as const,
                          name,
                          paneId: crypto.randomUUID(),
                          tabId: crypto.randomUUID(),
                          ...(sourceTerminalId && panel
                              ? {
                                    source: {
                                        panelId: panel.id,
                                        terminalId: sourceTerminalId,
                                    },
                                }
                              : {}),
                      },
                  ]
                : action.type === "rename"
                  ? [{ type: "panel.rename" as const, name }]
                  : [{ type: "panel.delete" as const, confirm: true as const }];
        const operation = send({ panelId: id, changes });
        feedback.reportOutcome(operation);
        if (action.type === "create") navigate(`/${action.section}/${id}`);
        if (action.type === "delete")
            void operation.result.then((outcome) => {
                if (
                    outcome.status === "confirmed" &&
                    currentPanel.current.section === action.panel.section &&
                    currentPanel.current.panelId === id
                )
                    navigate(`/${action.panel.section}`);
            });
        setAction(null);
    }
    async function requestDelete(panel: PanelPreview) {
        const request = ++deleteRequest.current;
        const operation = send({
            panelId: panel.id,
            changes: [{ type: "panel.delete", confirm: false }],
        });
        const outcome = await operation.result;
        const terminals =
            outcome.status === "rejected"
                ? confirmationTerminals(outcome.issue)
                : null;
        if (terminals) {
            if (deleteRequest.current === request)
                setAction({ type: "delete", panel, terminals });
            return;
        }
        feedback.reportOutcome(operation);
        if (
            outcome.status === "confirmed" &&
            currentPanel.current.section === panel.section &&
            currentPanel.current.panelId === panel.id
        )
            navigate(`/${panel.section}`);
    }
    async function read(ids?: string[]) {
        setReadError(null);
        const result = await Effect.runPromiseExit(
            connection.call((client, session) =>
                client["notifications.read"]({
                    clientSessionId: session.clientSessionId,
                    ids:
                        ids ??
                        state.notifications.map(
                            (notification) => notification.id,
                        ),
                }),
            ),
        );
        if (Exit.isFailure(result))
            setReadError(
                `Could not confirm notification read: ${Cause.pretty(result.cause)}`,
            );
    }
    function openNotification(notification: WebNotificationView) {
        void read([notification.id]);
        const target = findRuntimeTab(panels, notification.originRuntimeId);
        if (!target) navigate(`/notifications/${notification.id}`);
        else
            navigate(panelPath(target.panel), {
                state: { focusTabId: target.tab.id },
            });
    }
    const create = (section: Section) =>
        openAction({ type: "create", section });
    return (
        <AppLayout
            panels={panels}
            onCreate={create}
            onRename={(panel) => openAction({ type: "rename", panel })}
            onDelete={(panel) => void requestDelete(panel)}
        >
            <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                <AppHeader
                    title={title}
                    panel={panel}
                    notifications={state.notifications}
                    agentNameOf={(runtime) => agentName(panels, runtime)}
                    onSelect={openNotification}
                    onClearAll={() => void read()}
                />
                <CommandFeedback feedback={feedback} />
                {readError && (
                    <p role="alert" className="p-3 text-destructive">
                        {readError}
                    </p>
                )}
                {state.pending
                    .filter(
                        (row) =>
                            row.status === "unknown" ||
                            row.status === "blocked",
                    )
                    .map((row) => (
                        <p role="alert" className="p-3" key={row.key}>
                            {row.status === "unknown"
                                ? "Command result unknown. Check current state before acting again."
                                : typeof row.issue === "object" &&
                                    row.issue !== null &&
                                    "code" in row.issue &&
                                    row.issue.code === "sequence_gap"
                                  ? "Command not executed: sequence gap."
                                  : "Command could not be applied to the current layout."}{" "}
                            {JSON.stringify(row.issue)}
                        </p>
                    ))}
                {state.cleanups
                    .filter((cleanup) => cleanup.state === "failed")
                    .map((cleanup) => (
                        <p
                            role="alert"
                            className="p-3 text-destructive"
                            key={cleanup.id}
                        >
                            Process cleanup failed ({cleanup.terminalId}):{" "}
                            {cleanup.error}. The tab removal is separate from
                            process cleanup.
                        </p>
                    ))}
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="relative min-h-0 flex-1"
                >
                    {state.ready ? (
                        <Outlet
                            context={
                                {
                                    panels,
                                    onCreate: create,
                                    reportOutcome: feedback.reportOutcome,
                                } satisfies AppOutletContext
                            }
                        />
                    ) : (
                        <p role="status" className="p-6">
                            Loading application…
                        </p>
                    )}
                    {state.ready && connectionState?.phase !== "ready" && (
                        <ConnectionLost
                            stopped={connectionState?.phase === "stopped"}
                        />
                    )}
                </main>
            </div>
            {action && (
                <WorkspaceDialog
                    action={action}
                    onSubmit={submit}
                    onClose={() => openAction(null)}
                />
            )}
        </AppLayout>
    );
}
