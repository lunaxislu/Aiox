import { parseConfig, type ConfigView } from "@aiox/protocol";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { afterEach, expect, it, vi } from "vitest";

import type { ApplicationConnection } from "@/shared/api/application-connection";

import {
    ApplicationConfigProvider,
    useApplicationConfig,
} from "./application-config";

afterEach(cleanup);

it("reads config once for all consumers, refreshes on reconnect, and retains last-good settings on failure", async () => {
    const stored = { terminal: { theme: { background: "#123456" } } };
    const value: ConfigView = {
        revision: "r1",
        stored,
        effective: parseConfig(stored),
        runningPorts: { daemon: 4500, web: 4501 },
        restartRequired: false,
    };
    let ready = false;
    const listeners = new Set<() => void>();
    const read = vi.fn(() => Effect.succeed(value));
    const connection = {
        getSnapshot: () => ({ phase: ready ? "ready" : "reconnecting" }),
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        call: (run: (client: unknown, session: unknown) => unknown) =>
            run({ "config.read": read }, { clientSessionId: "s1" }),
    } as unknown as ApplicationConnection;
    function Consumer() {
        const config = useApplicationConfig();
        return (
            <output>
                {config.loaded
                    ? config.value?.effective.terminal?.theme?.background
                    : "loading"}
            </output>
        );
    }
    render(
        <ApplicationConfigProvider connection={connection}>
            <Consumer />
            <Consumer />
        </ApplicationConfigProvider>,
    );
    expect(read).not.toHaveBeenCalled();
    expect(screen.getAllByText("loading")).toHaveLength(2);
    const connect = (value: boolean) =>
        act(() => {
            ready = value;
            for (const listener of listeners) listener();
        });
    connect(true);
    await waitFor(() => expect(screen.getAllByText("#123456")).toHaveLength(2));
    expect(read).toHaveBeenCalledExactlyOnceWith({ clientSessionId: "s1" });
    connect(false);
    read.mockImplementationOnce(
        () => Effect.fail(new Error("invalid config")) as never,
    );
    connect(true);
    await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
            "invalid config",
        ),
    );
    expect(screen.getAllByText("#123456")).toHaveLength(2);
});
