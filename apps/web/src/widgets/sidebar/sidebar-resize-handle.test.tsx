import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { SidebarResizeHandle } from "./sidebar-resize-handle";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

it("resizes with left drag and stops when capture is lost", () => {
    const onResize = vi.fn();
    const { container } = render(
        <SidebarResizeHandle width={240} onResize={onResize} />,
    );
    const rail = container.querySelector<HTMLDivElement>(
        '[data-slot="sidebar-rail"]',
    )!;
    rail.setPointerCapture = vi.fn();

    expect(rail.hasAttribute("tabindex")).toBe(false);
    expect(rail.hasAttribute("role")).toBe(false);

    fireEvent.pointerDown(rail, { button: 2, clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 260, pointerId: 1 });
    expect(rail.setPointerCapture).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();

    fireEvent.pointerDown(rail, { button: 0, clientX: 240, pointerId: 1 });
    expect(rail.setPointerCapture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(rail, { clientX: 260, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(260);
    fireEvent.lostPointerCapture(rail, { pointerId: 1 });
    onResize.mockClear();
    fireEvent.pointerMove(rail, { clientX: 280, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();
});

it("uses the displayed width after CSS clamps it and allows requests above 400px", () => {
    const onResize = vi.fn();
    const { container } = render(
        <div data-slot="sidebar-container">
            <SidebarResizeHandle width={1200} onResize={onResize} />
        </div>,
    );
    const sidebar = container.firstElementChild!;
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue({
        width: 900,
    } as DOMRect);
    const rail = container.querySelector<HTMLDivElement>(
        '[data-slot="sidebar-rail"]',
    )!;
    rail.setPointerCapture = vi.fn();
    fireEvent.pointerDown(rail, { button: 0, clientX: 900, pointerId: 1 });
    fireEvent.pointerMove(rail, { clientX: 850, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(850);
});
