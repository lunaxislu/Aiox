import { PlusIcon, TerminalIcon } from "lucide-react";
import { useOutletContext, useParams } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import { isSection } from "@/entities/panel/model";
import { NotFoundPage } from "@/pages/not-found/not-found-page";
import { Button } from "@/shared/ui/button";
import { CopyCommand } from "@/shared/ui/copy-command";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty";

export function WorkspacePage() {
    const { panels } = useOutletContext<AppOutletContext>();
    const { section, panelId } = useParams();
    const panel = panels.find(
        (item) => item.section === section && item.id === panelId,
    );
    if (!isSection(section) || !panel) return <NotFoundPage />;
    console.log({ panels });
    return (
        <section
            aria-label={`${panel.name} workspace`}
            className="flex min-h-full flex-col"
        >
            <div className="flex h-9 shrink-0 items-center border-b px-2">
                <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled
                    aria-label="New terminal"
                >
                    <PlusIcon />
                </Button>
            </div>
            {/* 패널은 빈 캔버스라 Empty 기본값(정중앙)을 그대로 쓴다. */}
            <Empty className="p-5 md:p-8">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <TerminalIcon />
                    </EmptyMedia>
                    <EmptyTitle>
                        {panel.kind === "workspace"
                            ? "No terminals here"
                            : `No terminals in ${panel.name}`}
                    </EmptyTitle>
                    {panel.kind !== "workspace" && panel.command && (
                        <EmptyDescription>
                            Start it from a terminal:
                        </EmptyDescription>
                    )}
                </EmptyHeader>
                {panel.kind !== "workspace" && panel.command && (
                    <EmptyContent className="max-w-md">
                        <CopyCommand command={panel.command} />
                    </EmptyContent>
                )}
            </Empty>
        </section>
    );
}
