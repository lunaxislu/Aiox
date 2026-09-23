import { BellIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { Link } from "react-router";

import { ThemeToggle } from "@/features/theme/theme-toggle";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { useSidebar } from "@/shared/ui/sidebar";

export type HeaderActionsProps = { unreadCount: number };

export function HeaderActions({
    unreadCount,
    placement = "header",
    onNavigate,
}: HeaderActionsProps & {
    placement?: "header" | "drawer";
    onNavigate?: () => void;
}) {
    const { isMobile } = useSidebar();
    if (placement === "header" && isMobile) return null;
    return (
        <div className="flex shrink-0 items-center gap-1">
            {placement === "header" && (
                <Button
                    aria-label="Search"
                    className="w-40 justify-start"
                    disabled
                >
                    <SearchIcon aria-hidden="true" />
                    <span>Search</span>
                </Button>
            )}
            {(placement === "drawer" || !isMobile) && (
                <>
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
                        onClick={onNavigate}
                    >
                        <SettingsIcon aria-hidden="true" />
                    </Button>
                    <ThemeToggle />
                </>
            )}
        </div>
    );
}
