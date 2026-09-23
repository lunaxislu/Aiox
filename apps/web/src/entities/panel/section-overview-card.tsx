import { ArrowUpRightIcon } from "lucide-react";
import { Link } from "react-router";

import { kindIcons } from "@/entities/panel/icons";
import { panelPath, type PanelPreview } from "@/entities/panel/model";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/shared/ui/card";

const statusColors = {
    idle: "bg-emerald-500",
    working: "bg-blue-500",
    "awaiting-user": "bg-amber-500",
    failed: "bg-red-500",
    "aiox-preparing": "bg-violet-500",
};

export function SectionOverviewCard({ panel }: { panel: PanelPreview }) {
    const Icon = kindIcons[panel.kind];
    const affiliated = panel.agents.filter((agent) => !agent.standalone).length;
    const standalone = panel.agents.length - affiliated;
    return (
        <Link
            to={panelPath(panel)}
            className="group block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
        >
            <Card
                size="sm"
                className="h-full transition-colors group-hover:bg-accent/40 group-hover:ring-foreground/20"
            >
                <CardHeader>
                    <CardTitle className="flex min-w-0 items-center gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{panel.name}</span>
                    </CardTitle>
                    <CardAction>
                        <ArrowUpRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </CardAction>
                    <CardDescription className="truncate" title={panel.context}>
                        {panel.kind === "workspace"
                            ? `${panel.terminalCount} terminals`
                            : panel.context}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                        {affiliated} affiliated · {standalone} standalone
                    </p>
                    {panel.agents.length > 0 ? (
                        <ul className="space-y-1.5">
                            {panel.agents.map((agent) => (
                                <li
                                    key={agent.id}
                                    className="flex items-center gap-2 text-xs"
                                >
                                    <span
                                        className={`size-1.5 shrink-0 rounded-full ${statusColors[agent.status]}`}
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {agent.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">
                                        {agent.status}
                                        {agent.external ? " · external" : ""}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            No agents
                        </p>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
