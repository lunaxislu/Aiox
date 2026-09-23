import {
    ChevronRightIcon,
    PlusIcon,
    SettingsIcon,
    TerminalSquareIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { kindIcons } from "@/entities/panel/icons";
import {
    panelPath,
    sections,
    type PanelPreview,
    type Section,
} from "@/entities/panel/model";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/shared/ui/sidebar";

import { SidebarResizeHandle } from "./sidebar-resize-handle";

interface Props extends React.ComponentProps<typeof Sidebar> {
    sidebarWidth: number;
    panels: PanelPreview[];
    onResizeSidebar: (width: number) => void;
    onCreate: (section: Section) => void;
    onRename: (panel: PanelPreview) => void;
    onDelete: (panel: PanelPreview) => void;
}
export function AppSidebar(props: Props) {
    const {
        onResizeSidebar,
        sidebarWidth,
        onRename,
        onDelete,
        onCreate,
        panels,
        ...sidebarProps
    } = props;
    const { section: activeSection, panelId } = useParams();
    const { setOpenMobile, isMobile } = useSidebar();
    const closeMobileSidebar = () => isMobile && setOpenMobile(false);

    return (
        <Sidebar {...sidebarProps}>
            <SidebarHeader>
                <SidebarMenu className="flex-row justify-between md:flex-col">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            render={
                                <Link to={"/"} onClick={closeMobileSidebar} />
                            }
                        >
                            <div className="flex aspect-square size-6 items-center justify-center rounded-lg bg-sidebar-primary  text-sidebar-primary-foreground">
                                <TerminalSquareIcon className="size-4" />
                            </div>
                            <div className="leading-none">
                                <span className="font-medium uppercase">
                                    aiox
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem className="md:hidden">
                        <SidebarMenuButton
                            render={
                                <Link
                                    to="/settings"
                                    aria-label="Settings"
                                    onClick={closeMobileSidebar}
                                />
                            }
                        >
                            <SettingsIcon className="size-4" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {sections.map((section) => (
                            <Collapsible
                                key={section}
                                render={<SidebarMenuItem />}
                                className="group/collapsible"
                            >
                                <CollapsibleTrigger
                                    nativeButton={false}
                                    render={
                                        <SidebarMenuButton
                                            isActive={
                                                activeSection === section &&
                                                !panelId
                                            }
                                            render={
                                                <Link
                                                    to={`/${section}`}
                                                    onClick={closeMobileSidebar}
                                                />
                                            }
                                        />
                                    }
                                >
                                    <ChevronRightIcon className="size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                                    <span className="font-semibold uppercase tracking-wider">
                                        {section}
                                    </span>
                                </CollapsibleTrigger>
                                <SidebarMenuAction
                                    aria-label={`Create workspace in ${section}`}
                                    onClick={() => onCreate(section)}
                                >
                                    <PlusIcon className="size-4" />
                                </SidebarMenuAction>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {panels
                                            .filter(
                                                (panel) =>
                                                    panel.section === section,
                                            )
                                            .map((panel) => {
                                                const PanelIcon =
                                                    kindIcons[panel.kind];
                                                const isActive =
                                                    panel.id === panelId &&
                                                    activeSection === section;

                                                return (
                                                    <SidebarMenuSubItem
                                                        key={panel.id}
                                                    >
                                                        <ContextMenu
                                                            disabled={
                                                                panel.kind !==
                                                                "workspace"
                                                            }
                                                        >
                                                            <ContextMenuTrigger>
                                                                <SidebarMenuSubButton
                                                                    isActive={
                                                                        isActive
                                                                    }
                                                                    render={
                                                                        <Link
                                                                            to={panelPath(
                                                                                panel,
                                                                            )}
                                                                            onClick={
                                                                                closeMobileSidebar
                                                                            }
                                                                        />
                                                                    }
                                                                >
                                                                    <PanelIcon className="size-4 text-muted-foreground" />
                                                                    <span>
                                                                        {
                                                                            panel.name
                                                                        }
                                                                    </span>
                                                                </SidebarMenuSubButton>
                                                            </ContextMenuTrigger>
                                                            <ContextMenuContent>
                                                                <ContextMenuGroup>
                                                                    <ContextMenuItem
                                                                        onClick={() =>
                                                                            onRename(
                                                                                panel,
                                                                            )
                                                                        }
                                                                    >
                                                                        Rename
                                                                    </ContextMenuItem>
                                                                    <ContextMenuItem
                                                                        variant="destructive"
                                                                        onClick={() =>
                                                                            onDelete(
                                                                                panel,
                                                                            )
                                                                        }
                                                                    >
                                                                        Delete
                                                                    </ContextMenuItem>
                                                                </ContextMenuGroup>
                                                            </ContextMenuContent>
                                                        </ContextMenu>
                                                    </SidebarMenuSubItem>
                                                );
                                            })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarResizeHandle
                width={sidebarWidth}
                onResize={onResizeSidebar}
            />
        </Sidebar>
    );
}
