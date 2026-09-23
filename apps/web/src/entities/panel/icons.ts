import {
    FolderIcon,
    NetworkIcon,
    ServerIcon,
    type LucideIcon,
} from "lucide-react";

import type { PanelPreview, Section } from "@/entities/panel/model";

export const kindIcons: Record<PanelPreview["kind"], LucideIcon> = {
    workspace: FolderIcon,
    network: NetworkIcon,
    host: ServerIcon,
};

export const sectionIcons: Record<Section, LucideIcon> = {
    workspaces: FolderIcon,
    networks: NetworkIcon,
    hosts: ServerIcon,
};
