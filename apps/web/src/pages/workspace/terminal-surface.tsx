import {
    useLayoutEffect,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Workspace owns this surface; pane slots only determine its DOM location. */
export function TerminalSurface({
    slots,
    paneId,
    terminalId,
    onActivate,
    children,
}: {
    slots: RefObject<Map<string, HTMLDivElement>>;
    paneId: string;
    terminalId: string;
    onActivate: () => void;
    children: ReactNode;
}) {
    const [container] = useState(() => {
        const element = document.createElement("div");
        element.className = "h-full min-h-0 min-w-0";
        return element;
    });
    useLayoutEffect(() => {
        const slot = slots.current.get(paneId);
        if (slot && container.parentElement !== slot)
            slot.appendChild(container);
    });
    useLayoutEffect(() => () => container.remove(), [container]);

    // The portal target stays identical across pane moves. React owns the contents;
    // only this component moves the dedicated container between otherwise empty slots.
    return createPortal(
        <div
            className="h-full min-h-0 min-w-0"
            data-terminal-surface={terminalId}
            onPointerDownCapture={onActivate}
            onFocusCapture={onActivate}
        >
            {children}
        </div>,
        container,
    );
}
