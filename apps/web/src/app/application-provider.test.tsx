import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { ApplicationConnection } from "@/shared/api/application-connection";

import {
    ApplicationProvider,
    useApplicationConnection,
    useApplicationConnectionState,
} from "./application-provider";

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it("shares one connection and closes StrictMode mount/cleanup and pending reconnect work", async () => {
    const sockets: PendingSocket[] = [];
    class PendingSocket extends EventTarget {
        readyState = 0;
        static OPEN = 1;
        static CLOSED = 3;
        constructor() {
            super();
            sockets.push(this);
        }
        close() {
            this.readyState = 3;
            this.dispatchEvent(new Event("close"));
        }
        send() {}
    }
    vi.stubGlobal("WebSocket", PendingSocket);
    const connection = new ApplicationConnection(
        "ws://test.invalid/api/rpc",
        10,
    );
    const shared: ApplicationConnection[] = [];
    function Consumer() {
        const current = useApplicationConnection();
        const state = useApplicationConnectionState();
        if (current) shared.push(current);
        return <output>{state?.phase}</output>;
    }
    const view = render(
        <StrictMode>
            <ApplicationProvider connection={connection}>
                <Consumer />
                <Consumer />
            </ApplicationProvider>
        </StrictMode>,
    );
    await waitFor(() => expect(sockets).toHaveLength(1));
    expect(shared.every((item) => item === connection)).toBe(true);
    expect(screen.getAllByText("connecting")).toHaveLength(2);
    view.unmount();
    await waitFor(() =>
        expect(sockets.every((socket) => socket.readyState === 3)).toBe(true),
    );
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(sockets).toHaveLength(1);
    expect(connection.getSnapshot().phase).toBe("stopped");
});
