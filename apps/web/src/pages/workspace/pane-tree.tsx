import { type TabView } from "@aiox/protocol";
import { SortableContext } from "@dnd-kit/sortable";
import {
    PanelBottomIcon,
    PanelBottomOpenIcon,
    PanelRightOpenIcon,
    PlusIcon,
    XIcon,
} from "lucide-react";
import {
    Fragment,
    useCallback,
    useLayoutEffect,
    useRef,
    type RefObject,
} from "react";
import { useGroupRef } from "react-resizable-panels";

import type { PanelPreview } from "@/entities/panel/model";
import type {
    TerminalPreview,
    WorkspaceLayout,
} from "@/entities/panel/workspace-fixtures";
import {
    panelLayoutReferences,
    type PanelLayout,
} from "@/entities/panel/workspace-layout";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { CopyCommand } from "@/shared/ui/copy-command";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/shared/ui/empty";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/shared/ui/resizable";
import {
    ScrollArea,
    ScrollAreaContent,
    ScrollAreaViewport,
} from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

import { StatusDot, TabNotice, TerminalStatusBar } from "./terminal-body";
import { DraggableTab, PaneDropArea } from "./workspace-dnd";

type TreeProps = {
    panel: Pick<PanelPreview, "name" | "kind" | "command">;
    terminals: Record<string, TerminalPreview>;
    terminalSlots: RefObject<Map<string, HTMLDivElement>>;
    layout: PanelLayout;
    state: WorkspaceLayout;
    connections: Record<string, TerminalPreview["connection"]>;
    onLayoutChange: (layout: PanelLayout) => void;
    onSelect: (paneId: string, tabId: string) => void;
    onActivate: (paneId: string) => void;
    onClose: (tab: TabView, force?: boolean) => void;
    onDismiss?: ((tab: TabView) => void) | undefined;
    onAdd: (paneId: string, axis?: "x" | "y") => void;
};

export function PaneTree(props: TreeProps & { depth?: number }) {
    const { layout, depth = 0 } = props;
    if (layout.type === "pane") return <Pane {...props} pane={layout} />;
    return <Split {...props} layout={layout} depth={depth} />;
}
function Split(
    props: TreeProps & {
        layout: Extract<PanelLayout, { type: "split" }>;
        depth: number;
    },
) {
    const { layout, onLayoutChange, depth } = props;
    const groupRef = useGroupRef();
    // A nested group reuses its subtree's first pane id, so depth keeps the DOM id unique.
    const keys = layout.children.map(
        (child) => panelLayoutReferences(child).panes[0]!.id,
    );
    const ids = keys.map((key) => `${key}@${depth}`);
    const sizing = JSON.stringify(
        Object.fromEntries(
            ids.map((id, index) => [id, layout.weights[index]! * 100]),
        ),
    );
    useLayoutEffect(() => {
        groupRef.current?.setLayout(JSON.parse(sizing));
    }, [groupRef, sizing]);
    return (
        <ResizablePanelGroup
            // Register the new panel set before applying its layout. Terminal portals live outside this group.
            key={JSON.stringify([layout.axis, ids])}
            groupRef={groupRef}
            orientation={layout.axis === "x" ? "horizontal" : "vertical"}
            onLayoutChanged={(sizes, meta) => {
                if (!meta.isUserInteraction) return;
                const weights = ids.map((id) => sizes[id]! / 100);
                if (
                    weights.every(
                        (weight) => Number.isFinite(weight) && weight > 0,
                    )
                )
                    onLayoutChange({ ...layout, weights });
            }}
        >
            {layout.children.map((child, index) => (
                <Fragment key={keys[index]}>
                    {index > 0 && (
                        <ResizableHandle
                            aria-label="Resize panes"
                            className="z-10 transition-colors hover:bg-ring focus-visible:bg-ring"
                        />
                    )}
                    <ResizablePanel
                        id={ids[index]}
                        defaultSize={`${layout.weights[index]! * 100}%`}
                        minSize="8%"
                    >
                        <PaneTree
                            {...props}
                            depth={depth + 1}
                            layout={child}
                            onLayoutChange={(next) =>
                                onLayoutChange({
                                    ...layout,
                                    children: layout.children.map((item, i) =>
                                        i === index ? next : item,
                                    ),
                                })
                            }
                        />
                    </ResizablePanel>
                </Fragment>
            ))}
        </ResizablePanelGroup>
    );
}

function Pane({
    pane,
    ...props
}: TreeProps & { pane: Extract<PanelLayout, { type: "pane" }> }) {
    const {
        state,
        panel,
        terminals,
        connections,
        onSelect,
        onActivate,
        onClose,
        onAdd,
    } = props;
    const { terminalSlots } = props;
    const registerTerminalSlot = useCallback(
        (node: HTMLDivElement | null) => {
            if (!node) return;
            terminalSlots.current.set(pane.id, node);
            return () => {
                terminalSlots.current.delete(pane.id);
            };
        },
        [terminalSlots, pane.id],
    );
    const tabViewport = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const viewport = tabViewport.current;
        const selected = viewport?.querySelector<HTMLElement>(
            '[role="tab"][aria-selected="true"]',
        )?.parentElement;
        if (!viewport || !selected) return;
        const frame = viewport.getBoundingClientRect();
        const rect = selected.getBoundingClientRect();
        // Include the close button and leave room for the edge fade.
        if (rect.right > frame.right - 16)
            viewport.scrollLeft += rect.right - frame.right + 16;
        else if (rect.left < frame.left + 16)
            viewport.scrollLeft += rect.left - frame.left - 16;
    }, [pane.selectedTabId]);
    const tab = state.tabs.find((item) => item.id === pane.selectedTabId);
    const terminal = tab?.terminalId ? terminals[tab.terminalId] : undefined;
    const connection = tab?.terminalId
        ? (connections[JSON.stringify([tab.terminalId, tab.runtimeId])] ??
          terminal?.connection ??
          "connected")
        : "connected";
    return (
        <section
            aria-label={`Pane ${pane.id}`}
            className="flex h-full min-h-0 min-w-0 flex-col bg-background"
        >
            <Collapsible defaultOpen className="flex h-full min-h-0 flex-col">
                <Tabs
                    value={pane.selectedTabId}
                    onValueChange={(value) => {
                        if (typeof value === "string") onSelect(pane.id, value);
                    }}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex h-9 shrink-0 items-center border-b bg-muted/40">
                        <ScrollArea className="h-full min-w-0 flex-1">
                            <ScrollAreaViewport
                                ref={tabViewport}
                                data-tab-viewport
                                className="h-full w-full mask-[linear-gradient(to_right,transparent,black_min(16px,var(--scroll-area-overflow-x-start)),black_calc(100%-min(16px,var(--scroll-area-overflow-x-end))),transparent)]"
                            >
                                <ScrollAreaContent className="h-full w-max min-w-full">
                                    <PaneDropArea
                                        paneId={pane.id}
                                        kind="tabbar"
                                    >
                                        <SortableContext
                                            id={pane.id}
                                            items={pane.tabIds}
                                        >
                                            <TabsList
                                                aria-label={`Tabs in ${pane.id}`}
                                                activateOnFocus
                                                onClick={(event) => {
                                                    // Close buttons activate before removal in requestClose.
                                                    if (
                                                        (
                                                            event.target as Element
                                                        ).closest(
                                                            '[role="tab"]',
                                                        )
                                                    )
                                                        onActivate(pane.id);
                                                }}
                                                onFocus={() =>
                                                    onActivate(pane.id)
                                                }
                                                className="flex h-full w-max min-w-full"
                                            >
                                                {pane.tabIds.map((id) => {
                                                    const item =
                                                        state.tabs.find(
                                                            (value) =>
                                                                value.id === id,
                                                        )!;
                                                    const activity =
                                                        item.terminalId
                                                            ? terminals[
                                                                  item
                                                                      .terminalId
                                                              ]?.status
                                                            : undefined;
                                                    return (
                                                        <div
                                                            key={id}
                                                            data-sortable-tab
                                                            data-active={
                                                                state.activePaneId ===
                                                                    pane.id &&
                                                                pane.selectedTabId ===
                                                                    id
                                                            }
                                                            className="group/tab flex h-full shrink-0 items-center border-r border-border/60 opacity-60 transition-opacity data-[active=true]:opacity-100"
                                                        >
                                                            <DraggableTab
                                                                id={id}
                                                                value={id}
                                                                aria-label={`${item.label} · ${activity ?? item.presentation}`}
                                                                data-tab-id={id}
                                                                data-focused={
                                                                    state.activePaneId ===
                                                                        pane.id &&
                                                                    pane.selectedTabId ===
                                                                        id
                                                                }
                                                                className="flex h-full min-w-0 items-center gap-2 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                                            >
                                                                <StatusDot
                                                                    status={
                                                                        activity ??
                                                                        item.presentation
                                                                    }
                                                                />
                                                                <span
                                                                    className="max-w-36 truncate"
                                                                    title={
                                                                        item.label
                                                                    }
                                                                >
                                                                    {item.label}
                                                                </span>
                                                                {item.presentation ===
                                                                    "preparing" && (
                                                                    <span className="pending-indicator text-muted-foreground">
                                                                        preparing
                                                                    </span>
                                                                )}
                                                                {item.presentation ===
                                                                    "stopped" && (
                                                                    <span className="text-muted-foreground">
                                                                        stopped
                                                                    </span>
                                                                )}
                                                            </DraggableTab>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-xs"
                                                                className="mr-1 shrink-0 text-muted-foreground hover:text-foreground"
                                                                aria-label={`Close ${item.label}`}
                                                                onClick={() =>
                                                                    onClose(
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <XIcon />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </TabsList>
                                        </SortableContext>
                                    </PaneDropArea>
                                </ScrollAreaContent>
                            </ScrollAreaViewport>
                        </ScrollArea>
                        <div className="flex h-full shrink-0 items-center gap-0.5 border-l px-1">
                            {(
                                [
                                    {
                                        label: "New shell",
                                        icon: PlusIcon,
                                        axis: undefined,
                                    },
                                    {
                                        label: "Split right",
                                        icon: PanelRightOpenIcon,
                                        axis: "x",
                                    },
                                    {
                                        label: "Split down",
                                        icon: PanelBottomOpenIcon,
                                        axis: "y",
                                    },
                                ] as const
                            ).map(({ label, icon: Icon, axis }) => (
                                <Tooltip key={label}>
                                    <TooltipTrigger
                                        render={
                                            <Button
                                                data-pane-add={
                                                    axis === undefined
                                                        ? ""
                                                        : undefined
                                                }
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-muted-foreground"
                                                aria-label={`${label} in ${pane.id}`}
                                                onClick={() =>
                                                    onAdd(pane.id, axis)
                                                }
                                            />
                                        }
                                    >
                                        <Icon />
                                    </TooltipTrigger>
                                    <TooltipContent>{label}</TooltipContent>
                                </Tooltip>
                            ))}
                            <Separator
                                aria-hidden
                                orientation="vertical"
                                className="mx-1 my-2"
                            />
                            <Tooltip>
                                <TooltipTrigger
                                    delay={0}
                                    render={
                                        <CollapsibleTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground"
                                                />
                                            }
                                            disabled={!tab}
                                            aria-label="Status bar"
                                        />
                                    }
                                >
                                    <PanelBottomIcon />
                                </TooltipTrigger>
                                <TooltipContent>Status bar</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    <PaneDropArea paneId={pane.id} kind="body">
                        {tab ? (
                            <TabsContent
                                key={tab.id}
                                value={tab.id}
                                data-active={state.activePaneId === pane.id}
                                onPointerDown={() => onActivate(pane.id)}
                                onFocusCapture={() => onActivate(pane.id)}
                                className={cn(
                                    "min-h-0 flex-1 opacity-60 outline-none transition-opacity data-[active=true]:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                                    tab.notice
                                        ? "overflow-auto"
                                        : "overflow-hidden",
                                )}
                            >
                                {tab.notice ? (
                                    <TabNotice
                                        tab={tab}
                                        onDismiss={props.onDismiss}
                                    />
                                ) : tab.terminalId ? (
                                    <div
                                        className="h-full min-h-0 min-w-0"
                                        data-terminal-slot={pane.id}
                                        ref={registerTerminalSlot}
                                    />
                                ) : null}
                            </TabsContent>
                        ) : (
                            <Empty className="p-5">
                                <EmptyHeader>
                                    <EmptyTitle>
                                        {panel.kind === "workspace"
                                            ? "No terminals here"
                                            : `No terminals in ${panel.name}`}
                                    </EmptyTitle>
                                    <EmptyDescription>
                                        Use + to open a shell or split this
                                        pane.
                                    </EmptyDescription>
                                </EmptyHeader>
                                {panel.kind !== "workspace" &&
                                    panel.command && (
                                        <EmptyContent>
                                            <CopyCommand
                                                command={panel.command}
                                            />
                                        </EmptyContent>
                                    )}
                            </Empty>
                        )}
                    </PaneDropArea>
                </Tabs>
                {tab && (
                    <CollapsibleContent className="shrink-0">
                        <TerminalStatusBar
                            key={tab.id}
                            tab={tab}
                            terminal={terminal}
                            connection={connection}
                        />
                    </CollapsibleContent>
                )}
            </Collapsible>
        </section>
    );
}
