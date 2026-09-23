import {
    panelLayoutReferences,
    type AgentView,
    type PanelLayout,
    type TabView,
} from "@aiox/protocol";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CircleIcon,
    PanelRightOpenIcon,
    LoaderCircleIcon,
    MonitorXIcon,
    PanelBottomIcon,
    PlusIcon,
    PanelBottomOpenIcon,
    SquareIcon,
    TriangleAlertIcon,
    WifiOffIcon,
    XIcon,
} from "lucide-react";
import { Fragment, useLayoutEffect, useRef, useState } from "react";

import type { PanelPreview } from "@/entities/panel/model";
import type {
    TerminalPreview,
    WorkspaceLayout,
} from "@/entities/panel/workspace-fixtures";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/shared/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { CopyCommand } from "@/shared/ui/copy-command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/shared/ui/dialog";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

import {
    addPreviewShell,
    closePreviewTab,
    selectPreviewTab,
} from "./workspace-preview";

export type WorkspaceViewProps = {
    panel: Pick<
        PanelPreview,
        "id" | "name" | "kind" | "command" | "layout" | "activePaneId" | "tabs"
    >;
    terminals: Record<string, TerminalPreview>;
};

export function WorkspaceView({ panel, terminals }: WorkspaceViewProps) {
    const [state, setState] = useState<WorkspaceLayout>(panel);
    const [connections, setConnections] = useState<
        Record<string, TerminalPreview["connection"]>
    >({});
    const [closing, setClosing] = useState<TabView | null>(null);
    const cancel = useRef<HTMLButtonElement>(null);
    const host = useRef<HTMLElement>(null);

    function close(tab: TabView) {
        const next = closePreviewTab(state, tab.id);
        setState(next);
        setClosing(null);
        const selected = panelLayoutReferences(next.layout).panes.find(
            (pane) => pane.id === next.activePaneId,
        )?.selectedTabId;
        requestAnimationFrame(() => {
            const target = Array.from(
                host.current?.querySelectorAll<HTMLButtonElement>(
                    "[role=tab]",
                ) ?? [],
            ).find((button) => button.dataset.tabId === selected);
            (
                target ??
                host.current?.querySelector<HTMLButtonElement>(
                    "[data-pane-add]",
                )
            )?.focus();
        });
    }
    function requestClose(tab: TabView, force = false) {
        const terminal = tab.terminalId ? terminals[tab.terminalId] : undefined;
        const connection = tab.terminalId
            ? (connections[tab.terminalId] ?? terminal?.connection)
            : undefined;
        if (
            !force &&
            (tab.presentation === "stopped" ||
                tab.presentation === "start-failed" ||
                tab.presentation === "crashed" ||
                tab.presentation === "unavailable" ||
                (tab.presentation === "shell" &&
                    terminal?.busy === "idle" &&
                    connection === "connected"))
        )
            close(tab);
        else setClosing(tab);
    }
    function addShell(paneId: string, axis?: "x" | "y") {
        const id = crypto.randomUUID();
        const tab: TabView = {
            id,
            label: "shell",
            terminalId: `terminal-${id}`,
            runtimeId: null,
            agentKey: null,
            presentation: "shell",
            notice: null,
        };
        setState((current) =>
            addPreviewShell(current, paneId, tab, crypto.randomUUID(), axis),
        );
    }

    return (
        <section
            ref={host}
            aria-label={`${panel.name} workspace`}
            className="flex h-full min-h-0 min-w-0 flex-col bg-background"
        >
            <PaneTree
                layout={state.layout}
                state={state}
                panel={panel}
                terminals={terminals}
                connections={connections}
                onLayoutChange={(layout) =>
                    setState((current) => ({ ...current, layout }))
                }
                onSelect={(paneId, tabId) =>
                    setState((current) =>
                        selectPreviewTab(current, paneId, tabId),
                    )
                }
                onClose={requestClose}
                onAdd={addShell}
                onReconnect={(terminalId) =>
                    setConnections((current) => ({
                        ...current,
                        [terminalId]: "connected",
                    }))
                }
            />
            <Dialog
                open={closing !== null}
                onOpenChange={(open) => {
                    if (!open) setClosing(null);
                }}
            >
                <DialogContent initialFocus={cancel} showCloseButton={false}>
                    <DialogTitle>Close and stop {closing?.label}?</DialogTitle>
                    <DialogDescription>
                        Closing stops this terminal. It may still be running.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            ref={cancel}
                            onClick={() => setClosing(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (closing) close(closing);
                            }}
                        >
                            Close and stop
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}

type TreeProps = WorkspaceViewProps & {
    layout: PanelLayout;
    state: WorkspaceLayout;
    connections: Record<string, TerminalPreview["connection"]>;
    onLayoutChange: (layout: PanelLayout) => void;
    onSelect: (paneId: string, tabId: string) => void;
    onClose: (tab: TabView, force?: boolean) => void;
    onAdd: (paneId: string, axis?: "x" | "y") => void;
    onReconnect: (terminalId: string) => void;
};

function PaneTree(props: TreeProps & { depth?: number }) {
    const { layout, onLayoutChange, depth = 0 } = props;
    if (layout.type === "pane") return <Pane {...props} pane={layout} />;
    // A nested group reuses its subtree's first pane id, so depth keeps the DOM id unique.
    const keys = layout.children.map(
        (child) => panelLayoutReferences(child).panes[0]!.id,
    );
    const ids = keys.map((key) => `${key}@${depth}`);
    return (
        <ResizablePanelGroup
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
        onClose,
        onAdd,
        onReconnect,
    } = props;
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
        ? (connections[tab.terminalId] ?? terminal?.connection ?? "connected")
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
                                    <TabsList
                                        aria-label={`Tabs in ${pane.id}`}
                                        activateOnFocus
                                        className="flex h-full w-max min-w-full"
                                    >
                                        {pane.tabIds.map((id) => {
                                            const item = state.tabs.find(
                                                (value) => value.id === id,
                                            )!;
                                            const activity = item.terminalId
                                                ? terminals[item.terminalId]
                                                      ?.status
                                                : undefined;
                                            return (
                                                <div
                                                    key={id}
                                                    className="group/tab flex h-full shrink-0 items-center border-r border-border/60 has-aria-selected:bg-background"
                                                >
                                                    <TabsTrigger
                                                        value={id}
                                                        aria-label={`${item.label} · ${activity ?? item.presentation}`}
                                                        data-tab-id={id}
                                                        data-focused={
                                                            state.activePaneId ===
                                                                pane.id &&
                                                            pane.selectedTabId ===
                                                                id
                                                        }
                                                        onFocus={() => {
                                                            if (
                                                                pane.selectedTabId ===
                                                                    id &&
                                                                state.activePaneId !==
                                                                    pane.id
                                                            )
                                                                onSelect(
                                                                    pane.id,
                                                                    id,
                                                                );
                                                        }}
                                                        className="flex h-full min-w-0 items-center gap-2 px-3 text-xs opacity-95 outline-none transition-opacity data-[focused=true]:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                                    >
                                                        <StatusDot
                                                            status={
                                                                activity ??
                                                                item.presentation
                                                            }
                                                        />
                                                        <span
                                                            className="max-w-36 truncate"
                                                            title={item.label}
                                                        >
                                                            {item.label}
                                                        </span>
                                                        {item.presentation ===
                                                            "preparing" && (
                                                            <span className="text-muted-foreground">
                                                                preparing
                                                            </span>
                                                        )}
                                                        {item.presentation ===
                                                            "stopped" && (
                                                            <span className="text-muted-foreground">
                                                                stopped
                                                            </span>
                                                        )}
                                                    </TabsTrigger>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        className="mr-1 shrink-0 text-muted-foreground hover:text-foreground"
                                                        aria-label={`Close ${item.label}`}
                                                        onClick={() =>
                                                            onClose(item)
                                                        }
                                                    >
                                                        <XIcon />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </TabsList>
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
                    {tab ? (
                        <TabsContent
                            key={tab.id}
                            value={tab.id}
                            data-active={state.activePaneId === pane.id}
                            onPointerDown={() => {
                                if (state.activePaneId !== pane.id)
                                    onSelect(pane.id, tab.id);
                            }}
                            onFocusCapture={() => {
                                if (state.activePaneId !== pane.id)
                                    onSelect(pane.id, tab.id);
                            }}
                            className="min-h-0 flex-1 overflow-auto opacity-55 outline-none transition-opacity data-[active=true]:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                            {tab.notice ? (
                                <TabNotice tab={tab} />
                            ) : tab.terminalId ? (
                                <TerminalBody
                                    tab={tab}
                                    terminal={terminal}
                                    connection={connection}
                                    onReconnect={() =>
                                        onReconnect(tab.terminalId!)
                                    }
                                    onStop={() => onClose(tab, true)}
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
                                    Use + to open a shell or split this pane.
                                </EmptyDescription>
                            </EmptyHeader>
                            {panel.kind !== "workspace" && panel.command && (
                                <EmptyContent>
                                    <CopyCommand command={panel.command} />
                                </EmptyContent>
                            )}
                        </Empty>
                    )}
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

function TabNotice({ tab }: { tab: TabView }) {
    if (!tab.notice) return null;
    const preparing = tab.presentation === "preparing";
    const failed =
        tab.presentation === "start-failed" || tab.presentation === "crashed";
    return (
        <Empty className="min-h-full gap-5 p-4" role="status">
            <EmptyHeader className="gap-2.5">
                <EmptyMedia
                    variant="icon"
                    className={cn(
                        "size-10 rounded-xl",
                        failed && "bg-destructive/10 text-destructive",
                    )}
                >
                    {preparing ? (
                        <LoaderCircleIcon className="size-5 motion-safe:animate-spin" />
                    ) : failed ? (
                        <TriangleAlertIcon className="size-5" />
                    ) : tab.presentation === "stopped" ? (
                        <SquareIcon className="size-4" />
                    ) : (
                        <MonitorXIcon className="size-5" />
                    )}
                </EmptyMedia>
                <EmptyTitle className="text-base">
                    {tab.notice.message}
                </EmptyTitle>
                <EmptyDescription className="text-xs leading-relaxed wrap-break-word">
                    {preparing
                        ? "Waiting for the agent process to report ready."
                        : tab.notice.reason}
                </EmptyDescription>
            </EmptyHeader>
            {!preparing && (
                <EmptyContent className="max-w-none items-stretch gap-2 text-left">
                    <p className="text-center text-xs text-muted-foreground">
                        Run in your terminal to start again
                    </p>
                    <CopyCommand
                        className="w-fit max-w-full self-center"
                        command={tab.notice.restartCommand}
                    />
                </EmptyContent>
            )}
        </Empty>
    );
}

function TerminalBody({
    tab,
    terminal,
    connection,
    onReconnect,
    onStop,
}: {
    tab: TabView;
    terminal: TerminalPreview | undefined;
    connection: TerminalPreview["connection"];
    onReconnect: () => void;
    onStop: () => void;
}) {
    const unrestorable = connection === "unrestorable";
    const screenLost = connection === "screen-lost" || unrestorable;
    // Static terminal content for structural review; attach.ts is not connected yet.
    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {!screenLost && (
                <pre
                    className={cn(
                        "min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed",
                        connection !== "connected" && "opacity-40",
                    )}
                    aria-label={`${tab.label} terminal output`}
                >
                    {terminal?.output ?? "$ "}
                </pre>
            )}
            {connection !== "connected" && (
                <div className="absolute inset-0 flex overflow-auto bg-background/85 p-4 backdrop-blur-sm">
                    <Card
                        className="m-auto w-full max-w-sm shrink-0 gap-4 shadow-lg"
                        role="status"
                    >
                        <CardHeader className="gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                {connection === "reconnecting" ? (
                                    <LoaderCircleIcon className="size-5 motion-safe:animate-spin" />
                                ) : screenLost ? (
                                    <MonitorXIcon className="size-5" />
                                ) : (
                                    <WifiOffIcon className="size-5" />
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <CardTitle>
                                    {unrestorable
                                        ? "Terminal screen cannot be restored"
                                        : screenLost
                                          ? "Terminal screen could not be restored"
                                          : connection === "reconnecting"
                                            ? "Reconnecting…"
                                            : "Terminal disconnected"}
                                </CardTitle>
                                <CardDescription className="text-xs leading-relaxed">
                                    {unrestorable
                                        ? "The server confirmed this screen cannot be restored. Reconnecting is unavailable. You can stop the terminal, then open a new one. This does not confirm whether the process is still running."
                                        : connection === "reconnecting"
                                          ? "Trying to restore the terminal connection."
                                          : "Reconnect to restore the screen and keyboard link without restarting the process."}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {terminal?.reason && (
                                <p className="text-xs leading-relaxed text-muted-foreground wrap-break-word">
                                    {terminal.reason}
                                </p>
                            )}
                            <div className="flex min-w-0 items-baseline gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-xs">
                                <span className="shrink-0 text-muted-foreground">
                                    Terminal
                                </span>
                                <code className="min-w-0 break-all">
                                    {tab.terminalId}
                                </code>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-wrap gap-2">
                            {connection !== "reconnecting" && (
                                <Button
                                    size="sm"
                                    disabled={unrestorable}
                                    onClick={onReconnect}
                                >
                                    {screenLost
                                        ? "Reconnect screen"
                                        : "Reconnect"}
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={onStop}
                            >
                                Force stop
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

function TerminalStatusBar({
    tab,
    terminal,
    connection,
}: {
    tab: TabView;
    terminal: TerminalPreview | undefined;
    connection: TerminalPreview["connection"];
}) {
    const [expanded, setExpanded] = useState(false);
    const reason = tab.notice?.reason ?? terminal?.statusReason;
    const status = terminal?.status ?? tab.presentation;
    return (
        <div
            role="group"
            aria-label="Terminal status"
            className="flex min-w-0 flex-col border-t bg-muted/30 font-mono text-[11px] text-muted-foreground"
        >
            <div className="flex min-w-0 items-center gap-2 px-2 py-1">
                <span className="flex shrink-0 items-center gap-1.5">
                    <StatusDot status={status} />
                    {status}
                </span>
                {reason && !expanded && (
                    <span
                        className="min-w-0 flex-1 truncate border-l pl-2"
                        title={reason}
                    >
                        {reason}
                    </span>
                )}
                {terminal?.cwd && (
                    <span
                        className="ml-auto min-w-0 truncate"
                        title={terminal.cwd}
                    >
                        {terminal.cwd}
                    </span>
                )}
                {connection !== "connected" && (
                    <span
                        className="flex shrink-0 items-center gap-1 text-amber-600 dark:text-amber-400"
                        title={connection}
                    >
                        <TriangleAlertIcon className="size-3" />
                        <span className="sr-only">{connection}</span>
                    </span>
                )}
            </div>
            {reason && (
                <Collapsible open={expanded} onOpenChange={setExpanded}>
                    <CollapsibleTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="xs"
                                className="h-5 justify-start rounded-none px-2 font-mono text-[10px] text-muted-foreground"
                            />
                        }
                    >
                        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        {expanded ? "Collapse reason" : "Show full reason"}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="max-h-28 overflow-auto px-3 pb-2 leading-relaxed wrap-anywhere">
                        {reason}
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}

type Activity = AgentView["status"] | TabView["presentation"];
const statusDotColors: Partial<Record<Activity, string>> = {
    idle: "fill-emerald-500 text-emerald-500",
    working: "fill-blue-500 text-blue-500",
    tui: "fill-blue-500 text-blue-500",
    "awaiting-user": "fill-amber-500 text-amber-500",
    failed: "fill-destructive text-destructive",
    crashed: "fill-destructive text-destructive",
    "start-failed": "fill-destructive text-destructive",
    preparing: "fill-violet-500 text-violet-500",
    "aiox-preparing": "fill-violet-500 text-violet-500",
};

function StatusDot({ status }: { status: Activity }) {
    return (
        <CircleIcon
            aria-hidden="true"
            className={cn(
                "size-2 shrink-0",
                statusDotColors[status] ?? "text-muted-foreground",
            )}
        />
    );
}
