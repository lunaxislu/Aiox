import { FolderIcon, NetworkIcon, ServerIcon } from "lucide-react";

import type { Section } from "@/entities/panel/model";
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

const emptyStates = {
    workspaces: {
        title: "Start here",
        description:
            "A workspace is where your terminals live. Create one to run commands — including the aiox commands that create networks and hosts.",
    },
    networks: {
        title: "No networks yet",
        description:
            "Networks let agents talk to each other. Create one from a terminal:",
    },
    hosts: {
        title: "No hosts yet",
        description:
            "A host runs a set of agents declared in aiox.yaml, all sharing one working directory.",
    },
};

const emptyCommands = {
    networks: "aiox network create dev",
    hosts: "aiox host run --path ./aiox.yaml",
};
const sectionIcons = {
    workspaces: FolderIcon,
    networks: NetworkIcon,
    hosts: ServerIcon,
};
interface Props {
    section: Section;
    onCreate: (section: Section) => void;
}

export function SectionOverviewEmpty({ section, onCreate }: Props) {
    const { title, description } = emptyStates[section];
    const Icon = sectionIcons[section];
    return (
        <Empty className="min-h-52">
            <EmptyHeader className="max-w-xl">
                <EmptyMedia variant="icon">
                    <Icon />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-xl">
                {section === "workspaces" && (
                    <Button onClick={() => onCreate(section)}>
                        New workspace
                    </Button>
                )}
                {section !== "workspaces" && (
                    <CopyCommand
                        command={emptyCommands[section]}
                        className="max-w-sm"
                    />
                )}
            </EmptyContent>
        </Empty>
    );
}
