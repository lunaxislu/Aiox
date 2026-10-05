import { LoaderCircleIcon, WifiOffIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty";

/** Covers the main area while the application connection is down. The page underneath stays mounted but hidden; only the pane dividers (z-10) show through, and a background-colored text halo keeps the copy readable where they cross it. */
export function ConnectionLost({ stopped }: { stopped: boolean }) {
    return (
        <div className="absolute inset-0 flex">
            <div className="absolute inset-0 z-9 bg-background" />
            <Empty
                role="status"
                className="relative z-20 m-auto w-auto flex-none p-4 [text-shadow:0_0_2px_var(--background),0_0_6px_var(--background),0_0_10px_var(--background)]"
            >
                <EmptyHeader className="max-w-64">
                    <EmptyMedia variant="icon">
                        {stopped ? (
                            <WifiOffIcon />
                        ) : (
                            <LoaderCircleIcon className="motion-safe:animate-spin" />
                        )}
                    </EmptyMedia>
                    <EmptyTitle className="text-lg">Connection lost</EmptyTitle>
                    <EmptyDescription>
                        {stopped
                            ? "The connection to the daemon was lost and automatic reconnection stopped. Reload the page to try again."
                            : "The connection to the daemon was lost. Reconnecting automatically…"}
                    </EmptyDescription>
                </EmptyHeader>
                {stopped && (
                    <EmptyContent>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </EmptyContent>
                )}
            </Empty>
        </div>
    );
}
