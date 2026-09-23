import { SettingsIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import {
    Link,
    Outlet,
    useLoaderData,
    useNavigate,
    useParams,
} from "react-router";

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
import { SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/widgets/sidebar/app-sidebar";

export type AppOutletContext = {
    panels: PanelPreview[];
    onCreate: (section: Section) => void;
};

export function AppShell() {
    const { initialPanels } = useLoaderData<{
        initialPanels: PanelPreview[];
    }>();
    // W2 interaction fixtures. Connect real mutations after UI review.
    const [panels, setPanels] = useState(initialPanels);
    const [action, setAction] = useState<WorkspaceAction | null>(null);
    const [width, setWidth] = useState(240);

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
                context: "",
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

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": `clamp(180px, ${width}px, 90vw)`,
                } as CSSProperties
            }
        >
            <a
                href="#main-content"
                className="sr-only z-50 focus:not-sr-only focus:absolute focus:bg-background focus:p-2"
            >
                Skip to content
            </a>
            <AppSidebar
                panels={panels}
                sidebarWidth={width}
                onResizeSidebar={setWidth}
                onCreate={create}
                onRename={(panel) => setAction({ type: "rename", panel })}
                onDelete={(panel) => setAction({ type: "delete", panel })}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
                    <SidebarTrigger />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {title}
                    </span>
                    <Link
                        to="/settings"
                        aria-label="Settings"
                        className="hidden rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:block"
                    >
                        <SettingsIcon className="size-4" />
                    </Link>
                </header>
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="min-h-0 flex-1 overflow-y-auto"
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
        </SidebarProvider>
    );
}
