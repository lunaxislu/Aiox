import { useLocation, useOutletContext, useParams } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import { isSection } from "@/entities/panel/model";
import { terminalPreviews } from "@/entities/panel/workspace-fixtures";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

import { WorkspaceView } from "./workspace-view";

export function WorkspacePage() {
    const { panels } = useOutletContext<AppOutletContext>();
    const { section, panelId } = useParams();
    const { key, state } = useLocation();
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );
    if (!isSection(section) || !panel) return <NotFoundPage />;
    // 알림 클릭이 실어 보낸 탭. 같은 탭을 다시 지목해도 이동마다 적용되도록 key를 함께 넘긴다.
    const focusTabId = (state as { focusTabId?: string } | null)?.focusTabId;
    return (
        <WorkspaceView
            key={panel.id}
            panel={panel}
            terminals={terminalPreviews}
            tabSelectionRequest={
                focusTabId ? { tabId: focusTabId, key } : undefined
            }
        />
    );
}
