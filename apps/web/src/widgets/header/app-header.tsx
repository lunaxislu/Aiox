import { panelContext, type PanelPreview } from "@/entities/panel/model";
import { SidebarTrigger } from "@/shared/ui/sidebar";

import { HeaderActions, type HeaderActionsProps } from "./header-actions";

export function WorkspaceTitle({
    title,
    panel,
}: {
    title: string;
    panel: PanelPreview | undefined;
}) {
    const context = panel ? panelContext(panel) : "";
    return (
        <div
            className="flex min-w-0 flex-1 items-center"
            title={context ? `${title} · ${context}` : title}
        >
            <span className="min-w-0 max-w-full shrink-0 truncate">
                {title}
            </span>
            {context && <span className="min-w-0 truncate"> · {context}</span>}
        </div>
    );
}

export function AppHeader({
    title,
    panel,
    ...actions
}: HeaderActionsProps & {
    title: string;
    panel: PanelPreview | undefined;
}) {
    return (
        <header className="shrink-0 border-b">
            <div className="flex h-15 min-w-0 items-center gap-2 px-6">
                <SidebarTrigger />
                <WorkspaceTitle title={title} panel={panel} />
                <HeaderActions {...actions} />
            </div>
        </header>
    );
}
