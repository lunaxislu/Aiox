import {
    useState,
    type ComponentProps,
    type CSSProperties,
    type ReactNode,
} from "react";

import { SidebarProvider } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/widgets/sidebar/app-sidebar";

type AppLayoutProps = Pick<
    ComponentProps<typeof AppSidebar>,
    "panels" | "onCreate" | "onRename" | "onDelete"
> & {
    children: ReactNode;
};

export function AppLayout({ children, ...sidebarProps }: AppLayoutProps) {
    const [width, setWidth] = useState(240);

    return (
        <SidebarProvider
            className="h-dvh min-h-0 overflow-hidden"
            style={
                {
                    "--sidebar-width": `clamp(180px, ${width}px, 90vw)`,
                } as CSSProperties
            }
        >
            <a
                href="#main-content"
                className="sr-only z-50 focus:not-sr-only focus:absolute focus:bg-background focus:p-2"
            >
                Skip to content
            </a>
            <AppSidebar
                {...sidebarProps}
                sidebarWidth={width}
                onResizeSidebar={setWidth}
            />
            {children}
        </SidebarProvider>
    );
}
