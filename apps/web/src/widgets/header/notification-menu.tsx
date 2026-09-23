import type { WebNotificationView } from "@aiox/protocol";
import { BellIcon, BellOffIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { byNewest, relativeTime } from "@/entities/notification/model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaContent,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";

export type NotificationMenuProps = {
    notifications: readonly WebNotificationView[];
    /** 지금 있는 실행의 이름. 사라졌으면 null이라 본문과 시각만 남는다. */
    agentNameOf: (originRuntimeId: string) => string | null;
    onSelect: (notification: WebNotificationView) => void;
    onClearAll: () => void;
};

/** 열려 있는 동안만 1분마다 다시 계산한다. 닫으면 멈추고, 다시 열면 그때의 차이로 시작한다. */
function useNow(open: boolean) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!open) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, [open]);
    return now;
}

export function NotificationMenu({
    notifications,
    agentNameOf,
    onSelect,
    onClearAll,
}: NotificationMenuProps) {
    const [open, setOpen] = useState(false);
    const now = useNow(open);
    // 목록이 미확인만 담으므로 배지 수가 곧 항목 수다.
    const unreadCount = notifications.length;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                render={
                    <Button
                        size="icon"
                        className="relative"
                        aria-label={`Notifications: ${unreadCount} unread`}
                    />
                }
            >
                <BellIcon aria-hidden="true" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 min-w-4 bg-destructive px-1 text-[10px] text-white dark:bg-destructive"
                        aria-hidden="true"
                    >
                        {unreadCount}
                    </Badge>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                alignOffset={-4}
                sideOffset={4}
                className="flex max-h-(--available-height) w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden p-0"
            >
                <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm font-medium">Notifications</span>
                    <DropdownMenuItem
                        disabled={unreadCount === 0}
                        className="px-2 py-1 text-xs text-muted-foreground"
                        onClick={onClearAll}
                    >
                        Clear all
                    </DropdownMenuItem>
                </div>
                <Separator aria-hidden="true" />
                {unreadCount === 0 ? (
                    <Empty className="gap-3 px-4 py-7">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <BellOffIcon aria-hidden="true" />
                            </EmptyMedia>
                            <EmptyTitle className="text-xs font-normal text-muted-foreground">
                                No unread notifications
                            </EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <ScrollArea className="relative min-h-0 overflow-hidden">
                        <ScrollAreaViewport className="max-h-[min(18rem,calc(var(--available-height)-3rem))] overscroll-contain">
                            <ScrollAreaContent className="p-1">
                                {byNewest(notifications).map(
                                    (notification, index) => {
                                        const name = agentNameOf(
                                            notification.originRuntimeId,
                                        );
                                        return (
                                            <Fragment key={notification.id}>
                                                {index > 0 && (
                                                    <Separator
                                                        aria-hidden="true"
                                                        className="my-1 opacity-60"
                                                    />
                                                )}
                                                <DropdownMenuItem
                                                    className="min-w-0 flex-col items-start gap-1.5 px-2.5 py-2.5"
                                                    onClick={() =>
                                                        onSelect(notification)
                                                    }
                                                >
                                                    <div className="flex w-full min-w-0 items-baseline justify-between gap-3">
                                                        {name && (
                                                            <span className="min-w-0 truncate text-xs font-medium">
                                                                {name}
                                                            </span>
                                                        )}
                                                        <time
                                                            dateTime={new Date(
                                                                notification.createdAt,
                                                            ).toISOString()}
                                                            className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums"
                                                        >
                                                            {relativeTime(
                                                                notification.createdAt,
                                                                now,
                                                            )}
                                                        </time>
                                                    </div>
                                                    <span className="w-full text-xs leading-relaxed whitespace-normal wrap-anywhere">
                                                        {notification.body}
                                                    </span>
                                                </DropdownMenuItem>
                                            </Fragment>
                                        );
                                    },
                                )}
                            </ScrollAreaContent>
                        </ScrollAreaViewport>
                        <ScrollAreaScrollbar
                            orientation="vertical"
                            className="absolute inset-y-1 right-0 flex w-1.5 touch-none select-none p-px opacity-0 transition-opacity data-hovering:opacity-100 data-scrolling:opacity-100"
                        >
                            <ScrollAreaThumb className="w-full rounded-full bg-foreground/25" />
                        </ScrollAreaScrollbar>
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
