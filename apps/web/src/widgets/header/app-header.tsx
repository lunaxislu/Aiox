import { panelContext, type PanelPreview } from "@/entities/panel/model";
import { Alert, AlertDescription } from "@/shared/ui/alert";
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

export function ConnectionWarning({ connected }: { connected: boolean }) {
    return connected ? null : (
        <Alert role="status">
            <AlertDescription>Daemon disconnected</AlertDescription>
        </Alert>
    );
}

export function AppHeader({
    title,
    panel,
    connected,
    ...actions
}: HeaderActionsProps & {
    title: string;
    panel: PanelPreview | undefined;
    connected: boolean;
}) {
    return (
        <header className="shrink-0 border-b">
            <div className="flex h-15 min-w-0 items-center gap-2 px-6">
                <SidebarTrigger />
                <WorkspaceTitle title={title} panel={panel} />
                <HeaderActions {...actions} />
            </div>
            <ConnectionWarning connected={connected} />
        </header>
    );
}
