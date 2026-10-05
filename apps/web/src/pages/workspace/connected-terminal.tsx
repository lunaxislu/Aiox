import type { TabView } from "@aiox/protocol";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { useApplicationConfig } from "@/app/application-config";
import { useApplicationConnectionState } from "@/app/application-provider";
import {
    attachTerminal,
    type Attachment,
    type AttachmentState,
} from "@/attach";
import type { TerminalPreview } from "@/entities/panel/workspace-fixtures";

import "@xterm/xterm/css/xterm.css";

import { TerminalBody } from "./terminal-body";

const connections: Record<AttachmentState, TerminalPreview["connection"]> = {
    restoring: "restoring",
    connected: "connected",
    disconnected: "disconnected",
    exited: "exited",
    failed: "screen-lost",
    unrestorable: "unrestorable",
};

/** Keyed by execution at WorkspaceContent; pane moves only relocate its portal. */
export function ConnectedTerminal({
    tab,
    terminal,
    active,
    onConnection,
    onStop,
}: {
    tab: TabView;
    terminal: TerminalPreview | undefined;
    active: boolean;
    onConnection: (
        connection: TerminalPreview["connection"] | undefined,
    ) => void;
    onStop: () => void;
}) {
    const host = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const config = useApplicationConfig();
    const fontFamily = config.value?.effective.terminal?.fontFamily;
    const theme = config.value?.effective.terminal?.theme;
    const background = theme?.background;
    const configError = config.value ? undefined : config.error;
    const attachment = useRef<Attachment | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [status, setStatus] = useState<{
        connection: TerminalPreview["connection"];
        reason?: string;
    }>({ connection: "restoring" });
    // The app-level ConnectionLost overlay owns an outage; terminal sockets reattach once it ends.
    const phase = useApplicationConnectionState()?.phase;
    const offline = phase !== undefined && phase !== "ready";
    const reconnect = () => {
        setStatus((previous) => ({
            ...previous,
            connection: "reconnecting",
        }));
        setAttempt((value) => value + 1);
    };
    const resume = useEffectEvent(() => {
        if (status.connection === "disconnected") reconnect();
    });
    useEffect(() => {
        if (!offline) resume();
    }, [offline]);
    const canFocus = useEffectEvent(() => active);
    const notify = useEffectEvent(onConnection);
    const keybindings = useEffectEvent(
        () => config.value?.effective.terminal?.keybindings,
    );
    useEffect(() => {
        if (!host.current || !tab.terminalId || !config.loaded) return;
        let disposed = false;
        const report = (reason: string, state?: AttachmentState) => {
            if (disposed || !state) return;
            // The Agent stream ends before application state returns this tab to its shell.
            const connection =
                state === "exited" && tab.runtimeId
                    ? "restoring"
                    : state === "restoring" && attempt > 0
                      ? "reconnecting"
                      : connections[state];
            setStatus((previous) => ({
                connection,
                ...(state === "connected"
                    ? {}
                    : {
                          reason:
                              state === "restoring"
                                  ? (previous.reason ?? reason)
                                  : reason,
                      }),
            }));
            notify(connection);
        };
        try {
            if (configError)
                throw new Error(
                    `Could not load terminal configuration: ${configError}`,
                );
            attachment.current = attachTerminal(
                host.current,
                tab.terminalId,
                report,
                tab.runtimeId ?? undefined,
                canFocus,
                {
                    ...(fontFamily !== undefined ? { fontFamily } : {}),
                    ...(background !== undefined ? { background } : {}),
                    ...(theme !== undefined ? { theme } : {}),
                    onBackground: (color) => {
                        if (!disposed && surface.current)
                            surface.current.style.backgroundColor = color;
                    },
                },
                keybindings,
            );
        } catch (error) {
            report(
                error instanceof Error
                    ? error.message
                    : "Terminal connection failed",
                "disconnected",
            );
        }
        return () => {
            disposed = true;
            attachment.current?.close();
            attachment.current = null;
            notify(undefined);
        };
    }, [
        tab.terminalId,
        tab.runtimeId,
        attempt,
        config.loaded,
        configError,
        fontFamily,
        background,
    ]);
    useEffect(() => {
        if (active) attachment.current?.focus();
    }, [active]);
    return (
        <TerminalBody
            tab={tab}
            terminal={{
                ...terminal,
                cwd: terminal?.cwd ?? "",
                output: "",
                busy: terminal?.busy ?? "unknown",
                connection: status.connection,
                ...(status.reason ? { reason: status.reason } : {}),
            }}
            connection={offline ? "connected" : status.connection}
            onReconnect={reconnect}
            onStop={onStop}
        >
            <div ref={surface} className="flex min-h-0 min-w-0 flex-1 p-6">
                <div
                    ref={host}
                    className="min-h-0 min-w-0 flex-1"
                    aria-label={`${tab.label} terminal output`}
                />
            </div>
        </TerminalBody>
    );
}
