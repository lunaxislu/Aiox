import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Fragment, StrictMode, useCallback, useEffect, useRef } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { TerminalSurface } from "./terminal-surface";

afterEach(cleanup);

test.each([false, true])(
    "moving preserves DOM; hiding disposes it (StrictMode: %s)",
    (strict) => {
        const mounted = vi.fn();
        const disposed = vi.fn();
        const activate = vi.fn();
        function Body() {
            useEffect(() => {
                mounted();
                return disposed;
            }, []);
            return <input aria-label="Terminal input" defaultValue="" />;
        }
        function Workspace({
            pane,
            visible = true,
        }: {
            pane: string;
            visible?: boolean;
        }) {
            const slots = useRef(new Map<string, HTMLDivElement>());
            const register = useCallback(
                (node: HTMLDivElement | null) => {
                    if (!node) return;
                    slots.current.set(pane, node);
                    return () => {
                        slots.current.delete(pane);
                    };
                },
                [pane],
            );
            return (
                <div>
                    <div key={pane} data-terminal-slot={pane} ref={register} />
                    {visible && (
                        <TerminalSurface
                            slots={slots}
                            paneId={pane}
                            terminalId="terminal-a"
                            onActivate={activate}
                        >
                            <Body />
                        </TerminalSurface>
                    )}
                </div>
            );
        }
        const view = render(<Workspace pane="a" />, {
            wrapper: strict ? StrictMode : Fragment,
        });
        const input = screen.getByRole("textbox") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "unfinished input" } });
        const initialMounts = mounted.mock.calls.length;
        const initialDisposals = disposed.mock.calls.length;
        view.rerender(<Workspace pane="b" />);
        expect(screen.getByRole("textbox")).toBe(input);
        expect(input.value).toBe("unfinished input");
        expect(
            input.closest<HTMLElement>("[data-terminal-slot]")?.dataset
                .terminalSlot,
        ).toBe("b");
        expect(mounted).toHaveBeenCalledTimes(initialMounts);
        expect(disposed).toHaveBeenCalledTimes(initialDisposals);
        fireEvent.pointerDown(input);
        expect(activate).toHaveBeenCalledTimes(1);
        view.rerender(<Workspace pane="b" visible={false} />);
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(mounted.mock.calls.length - disposed.mock.calls.length).toBe(0);
        view.rerender(<Workspace pane="b" />);
        expect(screen.getByRole("textbox")).not.toBe(input);
        expect(mounted.mock.calls.length - disposed.mock.calls.length).toBe(1);
        view.unmount();
        expect(mounted.mock.calls.length - disposed.mock.calls.length).toBe(0);
    },
);
