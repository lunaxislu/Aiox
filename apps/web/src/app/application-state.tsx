import { panelLayoutReferences, type PanelView } from "@aiox/protocol";
import { useLiveQuery } from "@tanstack/react-db";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { ApplicationConnection } from "@/shared/api/application-connection";
import {
    applicationView,
    type ApplicationStore,
} from "@/shared/api/application-store";
import type { PanelInput } from "@/shared/api/panel-projection";

export type PanelSelection = {
    activePaneId: string;
    selectedTabId: Record<string, string | null>;
};
type Selections = Record<string, PanelSelection>;

function reconcileSelections(
    panels: PanelView[],
    previous: Selections,
): Selections {
    const next: Selections = {};
    for (const panel of panels) {
        const panes = panelLayoutReferences(panel.layout).panes;
        const old = previous[panel.id];
        const selectedTabId: PanelSelection["selectedTabId"] = {};
        for (const pane of panes) {
            const selected = old?.selectedTabId[pane.id];
            selectedTabId[pane.id] =
                selected && pane.tabIds.includes(selected)
                    ? selected
                    : (pane.tabIds[0] ?? null);
        }
        next[panel.id] = {
            activePaneId:
                panes.find((pane) => pane.id === old?.activePaneId)?.id ??
                panes[0]!.id,
            selectedTabId,
        };
    }
    return JSON.stringify(next) === JSON.stringify(previous) ? previous : next;
}

type State = {
    store: ApplicationStore;
    view: ReturnType<typeof applicationView>;
    panelCommand: (
        input: PanelInput,
    ) => ReturnType<ApplicationStore["panelCommand"]>;
    selections: Selections;
    select: (panelId: string, paneId: string, tabId?: string) => void;
};
const StateContext = createContext<State | null>(null);

export function ApplicationStateProvider({
    store,
    connection,
    children,
}: {
    store: ApplicationStore;
    connection: ApplicationConnection;
    children: ReactNode;
}) {
    const { data } = useLiveQuery(
        (q) => q.from({ row: store.collection }),
        [store],
    );
    const view = useMemo(() => applicationView(data), [data]);
    const [selections, setSelections] = useState<Selections>({});
    const current = reconcileSelections(view.panels, selections);
    if (current !== selections) setSelections(current);
    const panelCommand = useCallback(
        (input: PanelInput) => store.panelCommand(connection, input),
        [store, connection],
    );
    const select = useCallback(
        (panelId: string, paneId: string, tabId?: string) => {
            const panel = store
                .getView()
                .panels.find((item) => item.id === panelId);
            const pane =
                panel &&
                panelLayoutReferences(panel.layout).panes.find(
                    (item) => item.id === paneId,
                );
            if (!pane || (tabId !== undefined && !pane.tabIds.includes(tabId)))
                return;
            setSelections((previous) => ({
                ...previous,
                [panelId]: {
                    activePaneId: paneId,
                    selectedTabId: {
                        ...previous[panelId]?.selectedTabId,
                        [paneId]:
                            tabId ??
                            previous[panelId]?.selectedTabId[paneId] ??
                            pane.tabIds[0] ??
                            null,
                    },
                },
            }));
        },
        [store],
    );
    const value = useMemo(
        () => ({ store, view, panelCommand, selections: current, select }),
        [store, view, panelCommand, current, select],
    );
    return <StateContext value={value}>{children}</StateContext>;
}

function useStateContext() {
    const context = useContext(StateContext);
    if (!context) throw new Error("ApplicationProvider is required.");
    return context;
}
export function useApplicationStore() {
    return useStateContext().store;
}
export function useApplicationState() {
    return useStateContext().view;
}
export function usePanelCommand() {
    return useStateContext().panelCommand;
}
export function usePanelSelection(panelId: string) {
    const { selections, select } = useStateContext();
    return {
        selection: selections[panelId],
        select: (paneId: string, tabId?: string) =>
            select(panelId, paneId, tabId),
    };
}
