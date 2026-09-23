import { useOutletContext, useParams } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import { isSection } from "@/entities/panel/model";
import { terminalPreviews } from "@/entities/panel/workspace-fixtures";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

import { WorkspaceView } from "./workspace-view";

export function WorkspacePage() {
    const { panels } = useOutletContext<AppOutletContext>();
    const { section, panelId } = useParams();
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );
    if (!isSection(section) || !panel) return <NotFoundPage />;
    return (
        <WorkspaceView
            key={panel.id}
            panel={panel}
            terminals={terminalPreviews}
        />
    );
}
