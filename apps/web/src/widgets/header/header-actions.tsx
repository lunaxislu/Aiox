// SearchIcon: 커맨드 팔레트 보류로 함께 주석. docs/specs/aiox-web-ui.md 커맨드 팔레트 절.
import { BellIcon, SettingsIcon } from "lucide-react";
import { Link } from "react-router";

import { ThemeToggle } from "@/features/theme/theme-toggle";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useSidebar } from "@/shared/ui/sidebar";

export type HeaderActionsProps = { unreadCount: number };

export function HeaderActions({ unreadCount }: HeaderActionsProps) {
    const { setOpenMobile, isMobile } = useSidebar();
    // 설정 진입은 화면 이동이라 드로어를 닫는다. 테마 토글은 이동이 아니라 유지한다.
    const closeMobileSidebar = () => isMobile && setOpenMobile(false);
    return (
        <div className="flex shrink-0 items-center gap-1">
            {/* 커맨드 팔레트를 보류해 검색 진입을 주석으로 남긴다. 팔레트를 만들 때 되살린다.
            {placement === "header" && (
                <Button
                    aria-label="Search"
                    className="w-40 justify-start"
                    disabled
                >
                    <SearchIcon aria-hidden="true" />
                    <span>Search</span>
                </Button>
            )} */}
            <Button
                size="icon"
                className="relative"
                aria-label={`Notifications: ${unreadCount} unread`}
                disabled
            >
                <BellIcon aria-hidden="true" />
                {unreadCount > 0 && (
                    <Badge
                        className="absolute -right-1 -top-1"
                        aria-hidden="true"
                    >
                        {unreadCount}
                    </Badge>
                )}
            </Button>
            <Button
                size="icon"
                nativeButton={false}
                render={<Link to="/settings" />}
                aria-label="Settings"
                onClick={closeMobileSidebar}
            >
                <SettingsIcon aria-hidden="true" />
            </Button>
            <ThemeToggle />
        </div>
    );
}
