import type { WebNotificationView } from "@aiox/protocol";
import { useState } from "react";
import { Outlet, useLoaderData, useNavigate, useParams } from "react-router";

import { previewNotifications } from "@/entities/notification/fixtures";
import { agentName, findRuntimeTab } from "@/entities/notification/model";
import { previewHeader } from "@/entities/panel/fixtures";
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
import { useApplicationConnectionState } from "./application-provider";

export type AppOutletContext = {
    panels: PanelPreview[];
    onCreate: (section: Section) => void;
};

export function AppShell({
    initialNotifications = previewNotifications,
    connected,
}: {
    initialNotifications?: WebNotificationView[];
    connected?: boolean;
}) {
    const connection = useApplicationConnectionState();
    const isConnected =
        connected ??
        (connection ? connection.phase === "ready" : previewHeader.connected);
    const { initialPanels } = useLoaderData<{
        initialPanels: PanelPreview[];
    }>();
    // W2 interaction fixtures. Connect real mutations after UI review.
    const [panels, setPanels] = useState(initialPanels);
    // W7 fixture. 읽음 요청은 W10에서 클릭이 ids 하나, Clear all이 ids 생략으로 붙는다.
    const [notifications, setNotifications] = useState(initialNotifications);
    const [action, setAction] = useState<WorkspaceAction | null>(null);

    const navigate = useNavigate();
    const { section, panelId } = useParams();
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );

    const title =
        panel?.name ??
        (isSection(section) && !panelId ? sectionLabels[section] : "");
    function submit(name: string) {
        if (!action) return;
        if (action.type === "create") {
            const panel: PanelPreview = {
                id: crypto.randomUUID(),
                kind: "workspace",
                section: action.section,
                name,
                terminalCount: 0,
                layout: {
                    type: "pane",
                    id: "root",
                    tabIds: [],
                    selectedTabId: null,
                },
                activePaneId: "root",
                tabs: [],
                agents: [],
            };
            setPanels((value) => [...value, panel]);
            navigate(panelPath(panel));
        } else if (action.type === "rename") {
            setPanels((value) =>
                value.map((panel) =>
                    panel.id === action.panel.id ? { ...panel, name } : panel,
                ),
            );
        } else {
            setPanels((value) =>
                value.filter((panel) => panel.id !== action.panel.id),
            );
            navigate(`/${action.panel.section}`);
        }
        setAction(null);
    }
    const create = (section: PanelPreview["section"]) =>
        setAction({ type: "create", section });

    /** 누르는 것으로 이동과 확인이 함께 끝난다. 대상이 없어도 확인은 한다. */
    function openNotification(notification: WebNotificationView) {
        setNotifications((value) =>
            value.filter((item) => item.id !== notification.id),
        );
        const target = findRuntimeTab(panels, notification.originRuntimeId);
        if (!target) {
            navigate(`/notifications/${notification.id}`);
            return;
        }
        navigate(panelPath(target.panel), {
            state: { focusTabId: target.tab.id },
        });
    }

    return (
        <AppLayout
            panels={panels}
            onCreate={create}
            onRename={(panel) => setAction({ type: "rename", panel })}
            onDelete={(panel) =>
                setAction({
                    type: "delete",
                    panel,
                    terminals: panel.tabs.map((tab) => ({
                        tabId: tab.id,
                        label: tab.label,
                        status: tab.runtimeId ? "running" : "unknown",
                    })),
                })
            }
        >
            <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                <AppHeader
                    title={title}
                    panel={panel}
                    connected={isConnected}
                    notifications={notifications}
                    agentNameOf={(runtimeId) => agentName(panels, runtimeId)}
                    onSelect={openNotification}
                    onClearAll={() => setNotifications([])}
                />
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="min-h-0 flex-1 "
                >
                    <Outlet
                        context={
                            {
                                panels,
                                onCreate: create,
                            } satisfies AppOutletContext
                        }
                    />
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
