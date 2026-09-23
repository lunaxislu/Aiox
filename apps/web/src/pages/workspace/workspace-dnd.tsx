import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
    type CollisionDetection,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import {
    createContext,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from "react";

import type { WorkspaceLayout } from "@/entities/panel/workspace-fixtures";
import { TabsTrigger } from "@/shared/ui/tabs";

import { dropZone, type TabDrop } from "./workspace-preview";

type Preview = TabDrop & { line?: number };
const DropPreview = createContext<Preview | null>(null);

export function WorkspaceDnd({
    state,
    onDrop,
    children,
}: {
    state: WorkspaceLayout;
    onDrop: (tabId: string, target: TabDrop) => void;
    children: ReactNode;
}) {
    const [active, setActive] = useState<string | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const target = useRef<Preview | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor),
    );
    const collisionDetection: CollisionDetection = ({
        pointerCoordinates,
        collisionRect,
        droppableContainers,
        droppableRects,
    }) => {
        target.current = null;
        const point = pointerCoordinates ?? {
            x: collisionRect.left + collisionRect.width / 2,
            y: collisionRect.top + collisionRect.height / 2,
        };
        for (const container of droppableContainers) {
            const data = container.data.current;
            if (data?.kind !== "tabbar" && data?.kind !== "body") continue;
            const viewport =
                data.kind === "tabbar"
                    ? container.node.current?.closest<HTMLElement>(
                          "[data-tab-viewport]",
                      )
                    : undefined;
            const rect =
                viewport?.getBoundingClientRect() ??
                droppableRects.get(container.id);
            if (
                !rect ||
                point.x < rect.left ||
                point.x > rect.right ||
                point.y < rect.top ||
                point.y > rect.bottom
            )
                continue;
            if (data.kind === "body") {
                target.current = {
                    paneId: data.paneId,
                    zone: dropZone(
                        (point.x - rect.left) / rect.width,
                        (point.y - rect.top) / rect.height,
                    ),
                };
            } else {
                const tabs = Array.from(
                    container.node.current?.querySelectorAll<HTMLElement>(
                        "[data-sortable-tab]",
                    ) ?? [],
                );
                let index = tabs.length;
                let line =
                    tabs.at(-1)?.getBoundingClientRect().right ?? rect.left;
                for (let i = 0; i < tabs.length; i++) {
                    const tab = tabs[i]!.getBoundingClientRect();
                    if (point.x < tab.left + tab.width / 2) {
                        index = i;
                        line = tab.left;
                        break;
                    }
                }
                target.current = {
                    paneId: data.paneId,
                    zone: "tabbar",
                    index,
                    line: line - rect.left + (viewport?.scrollLeft ?? 0),
                };
            }
            return [{ id: container.id }];
        }
        return [];
    };
    function reset() {
        target.current = null;
        setPreview(null);
        setActive(null);
    }
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={({ active }) => setActive(String(active.id))}
            onDragMove={() => setPreview(target.current)}
            onDragOver={() => setPreview(target.current)}
            onDragCancel={reset}
            onDragEnd={({ active }) => {
                if (target.current) onDrop(String(active.id), target.current);
                reset();
            }}
        >
            <DropPreview.Provider value={preview}>
                {children}
            </DropPreview.Provider>
            <DragOverlay dropAnimation={null}>
                {active ? (
                    <div className="pointer-events-none rounded border bg-background px-3 py-2 text-xs shadow">
                        {state.tabs.find((tab) => tab.id === active)?.label}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export function DraggableTab({
    id,
    children,
    ...props
}: React.ComponentProps<typeof TabsTrigger> & { id: string }) {
    const {
        setNodeRef,
        setActivatorNodeRef,
        listeners,
        attributes,
        isDragging,
    } = useSortable({ id });
    return (
        <TabsTrigger
            {...props}
            {...listeners}
            ref={(node) => {
                setNodeRef(node);
                setActivatorNodeRef(node);
            }}
            aria-describedby={attributes["aria-describedby"]}
            aria-roledescription="sortable tab"
            data-dragging={isDragging || undefined}
            style={{ ...props.style, touchAction: "none" }}
        >
            {children}
        </TabsTrigger>
    );
}

export function PaneDropArea({
    paneId,
    kind,
    children,
}: {
    paneId: string;
    kind: "body" | "tabbar";
    children: ReactNode;
}) {
    const { setNodeRef } = useDroppable({
        id: `${kind}:${paneId}`,
        data: { kind, paneId },
    });
    const preview = useContext(DropPreview);
    const shown =
        preview?.paneId === paneId &&
        (kind === "tabbar"
            ? preview.zone === "tabbar"
            : preview.zone !== "tabbar");
    const zone = preview?.zone;
    return (
        <div
            ref={setNodeRef}
            className={
                kind === "body"
                    ? "relative flex min-h-0 flex-1 flex-col"
                    : "relative h-full w-max min-w-full"
            }
        >
            {children}
            {shown && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute z-20 border border-ring bg-ring/20"
                    style={
                        kind === "tabbar"
                            ? {
                                  top: 0,
                                  bottom: 0,
                                  width: 2,
                                  left: preview.line,
                              }
                            : {
                                  top: zone === "bottom" ? "50%" : 0,
                                  bottom: zone === "top" ? "50%" : 0,
                                  left: zone === "right" ? "50%" : 0,
                                  right: zone === "left" ? "50%" : 0,
                              }
                    }
                />
            )}
        </div>
    );
}
