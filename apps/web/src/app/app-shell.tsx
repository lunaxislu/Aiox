import type { WebNotificationView } from "@aiox/protocol";
import { Effect, Exit, Cause } from "effect";
import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router";

import { agentName, findRuntimeTab } from "@/entities/notification/model";
import { applicationPanels } from "@/entities/panel/application-panels";
import {
    isSection,
    panelPath,
    sectionLabels,
    type PanelPreview,
    type Section,
} from "@/entities/panel/model";
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
import { useApplicationState, usePanelCommand } from "./application-state";
import { CommandFeedback, useCommandFeedback } from "./command-feedback";
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
    const [readError, setReadError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { section, panelId } = useParams();
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
        const id =
            action.type === "create" ? crypto.randomUUID() : action.panel.id;
        const changes =
            action.type === "create"
                ? [
                      {
                          type: "panel.create" as const,
                          name,
                          section: action.section,
                          paneId: crypto.randomUUID(),
                          tabId: crypto.randomUUID(),
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
    const create = (section: Section) => setAction({ type: "create", section });
    return (
        <AppLayout
            panels={panels}
            onCreate={create}
            onRename={(panel) => setAction({ type: "rename", panel })}
            onDelete={(panel) => setAction({ type: "delete", panel })}
        >
            <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                <AppHeader
                    title={title}
                    panel={panel}
                    connected={connectionState?.phase === "ready"}
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
                    className="min-h-0 flex-1"
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
                </main>
            </div>
            {action && (
                <WorkspaceDialog
                    action={action}
                    onSubmit={submit}
                    onClose={() => setAction(null)}
                />
            )}
        </AppLayout>
    );
}
