import { useRef } from "react";

import { SidebarRail } from "@/shared/ui/sidebar";

export function SidebarResizeHandle({
    width,
    onResize,
}: {
    width: number;
    onResize: (width: number) => void;
}) {
    const rail = useRef<HTMLDivElement>(null);
    const renderedWidth = () =>
        rail.current
            ?.closest('[data-slot="sidebar-container"]')
            ?.getBoundingClientRect().width ?? width;

    const drag = useRef<{ x: number; width: number } | null>(null);
    const resize = (next: number) => onResize(Math.max(180, next));
    return (
        <SidebarRail
            ref={rail}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                drag.current = { x: event.clientX, width: renderedWidth() };
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
                if (drag.current)
                    resize(drag.current.width + event.clientX - drag.current.x);
            }}
            onLostPointerCapture={() => {
                drag.current = null;
            }}
        />
    );
}
