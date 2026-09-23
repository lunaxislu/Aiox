import { SortableContext } from "@dnd-kit/sortable";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { workspacePreview } from "@/entities/panel/workspace-fixtures";
import { Tabs, TabsList } from "@/shared/ui/tabs";

import { DraggableTab, PaneDropArea, WorkspaceDnd } from "./workspace-dnd";

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

test("pointer drop commits once, while Escape cancels without committing", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
            const left =
                this.dataset.testid === "destination" ||
                this.querySelector('[data-testid="destination"]')
                    ? 300
                    : 0;
            return {
                x: left,
                y: 0,
                left,
                top: 0,
                width: 200,
                height: 100,
                right: left + 200,
                bottom: 100,
                toJSON: () => ({}),
            };
        },
    );
    const onDrop = vi.fn();
    render(
        <WorkspaceDnd state={workspacePreview} onDrop={onDrop}>
            <Tabs value="shell">
                <SortableContext items={["shell"]}>
                    <TabsList>
                        <DraggableTab id="shell" value="shell">
                            Shell
                        </DraggableTab>
                    </TabsList>
                </SortableContext>
            </Tabs>
            <PaneDropArea paneId="target" kind="body">
                <div data-testid="destination">Destination</div>
            </PaneDropArea>
        </WorkspaceDnd>,
    );
    const tab = screen.getByRole("tab");
    fireEvent.pointerDown(tab, {
        pointerId: 1,
        button: 0,
        isPrimary: true,
        clientX: 50,
        clientY: 50,
    });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 70, clientY: 50 });
    await waitFor(() => expect(tab.getAttribute("data-dragging")).toBe("true"));
    fireEvent.pointerMove(document, {
        pointerId: 1,
        clientX: 400,
        clientY: 50,
    });
    expect(onDrop).not.toHaveBeenCalled();
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 400, clientY: 50 });
    expect(onDrop).toHaveBeenCalledWith("shell", {
        paneId: "target",
        zone: "center",
    });
    expect(onDrop).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(tab, {
        pointerId: 2,
        button: 0,
        isPrimary: true,
        clientX: 50,
        clientY: 50,
    });
    fireEvent.pointerMove(document, { pointerId: 2, clientX: 70, clientY: 50 });
    await waitFor(() => expect(tab.getAttribute("data-dragging")).toBe("true"));
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(tab.getAttribute("data-dragging")).toBeNull();
});
