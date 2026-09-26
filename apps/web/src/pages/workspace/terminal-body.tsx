import type { AgentView, TabView } from "@aiox/protocol";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CircleIcon,
    LoaderCircleIcon,
    MonitorXIcon,
    SquareIcon,
    TriangleAlertIcon,
    WifiOffIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import type { TerminalPreview } from "@/entities/panel/workspace-fixtures";
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
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty";

export function TabNotice({
    tab,
    onDismiss,
}: {
    tab: TabView;
    onDismiss?: ((tab: TabView) => void) | undefined;
}) {
    if (!tab.notice) return null;
    const preparing = tab.presentation === "preparing";
    const failed =
        tab.presentation === "start-failed" || tab.presentation === "crashed";
    return (
        <Empty
            className={cn(
                "min-h-full gap-5 p-4",
                preparing && "pending-indicator",
            )}
            role="status"
        >
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
                        onCopied={
                            tab.terminalId && onDismiss
                                ? () => onDismiss(tab)
                                : undefined
                        }
                    />
                </EmptyContent>
            )}
        </Empty>
    );
}

export function TerminalBody({
    tab,
    terminal,
    connection,
    onReconnect,
    onStop,
    children,
}: {
    tab: TabView;
    terminal: TerminalPreview | undefined;
    connection: TerminalPreview["connection"];
    onReconnect: () => void;
    onStop: () => void;
    children?: ReactNode;
}) {
    const unrestorable = connection === "unrestorable";
    const screenLost = connection === "screen-lost" || unrestorable;
    const restoring =
        connection === "restoring" || connection === "reconnecting";
    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {children ??
                (!screenLost && (
                    <pre
                        className={cn(
                            "min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed",
                            connection !== "connected" && "opacity-40",
                        )}
                        aria-label={`${tab.label} terminal output`}
                    >
                        {terminal?.output ?? "$ "}
                    </pre>
                ))}
            {connection === "restoring" && (
                <div
                    role="status"
                    className="pending-indicator pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground"
                >
                    <LoaderCircleIcon
                        aria-hidden="true"
                        className="size-4 motion-safe:animate-spin"
                    />
                    Restoring terminal…
                </div>
            )}
            {connection !== "connected" && connection !== "restoring" && (
                <div className="absolute inset-0 flex overflow-auto bg-background/85 p-4 backdrop-blur-sm">
                    <Card
                        className="m-auto w-full max-w-sm shrink-0 gap-4 shadow-lg"
                        role="status"
                    >
                        <CardHeader className="gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                {restoring ? (
                                    <LoaderCircleIcon className="size-5 motion-safe:animate-spin" />
                                ) : screenLost ? (
                                    <MonitorXIcon className="size-5" />
                                ) : (
                                    <WifiOffIcon className="size-5" />
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <CardTitle>
                                    {connection === "exited"
                                        ? "Terminal process exited"
                                        : unrestorable
                                          ? "Terminal screen cannot be restored"
                                          : screenLost
                                            ? "Terminal screen could not be restored"
                                            : connection === "reconnecting"
                                              ? "Reconnecting…"
                                              : "Terminal disconnected"}
                                </CardTitle>
                                <CardDescription className="text-xs leading-relaxed">
                                    {connection === "exited"
                                        ? "The terminal stream reported process exit. Closing removes this tab."
                                        : unrestorable
                                          ? "The server confirmed this screen cannot be restored. Reconnecting is unavailable. You can stop the terminal, then open a new one. This does not confirm whether the process is still running."
                                          : restoring
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
                            {!restoring && connection !== "exited" && (
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

export function TerminalStatusBar({
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
        <Collapsible
            open={expanded}
            onOpenChange={setExpanded}
            role="group"
            aria-label="Terminal status"
            className="flex min-w-0 flex-col border-t bg-muted/30 font-mono text-[11px] text-muted-foreground"
        >
            <div className="flex h-6 shrink-0 min-w-0 items-center gap-2 px-2">
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
                {reason && (
                    <CollapsibleTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="xs"
                                className="h-5 shrink-0 justify-start rounded-none px-2 font-mono text-[10px] text-muted-foreground"
                            />
                        }
                    >
                        {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        {expanded ? "Collapse reason" : "Show full reason"}
                    </CollapsibleTrigger>
                )}
            </div>
            {reason && (
                <CollapsibleContent className="max-h-28 overflow-auto px-3 pb-2 leading-relaxed wrap-anywhere">
                    {reason}
                </CollapsibleContent>
            )}
        </Collapsible>
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

export function StatusDot({ status }: { status: Activity }) {
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
