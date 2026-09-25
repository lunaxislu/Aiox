import type { ConfigView } from "@aiox/protocol";
import { Effect } from "effect";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import type { ApplicationConnection } from "@/shared/api/application-connection";

type Configuration = { loaded: boolean; value?: ConfigView; error?: string };
const ConfigContext = createContext<Configuration>({ loaded: true });

/** Config is read on connection, not broadcast with application resources. */
export function ApplicationConfigProvider({
    connection,
    children,
}: {
    connection: ApplicationConnection;
    children: ReactNode;
}) {
    const ready = useSyncExternalStore(
        connection.subscribe,
        () => connection.getSnapshot().phase === "ready",
    );
    const [configuration, setConfiguration] = useState<Configuration>({
        loaded: false,
    });
    useEffect(() => {
        if (!ready) return;
        const controller = new AbortController();
        void Effect.runPromise(
            connection.call((client, session) =>
                client["config.read"]({
                    clientSessionId: session.clientSessionId,
                }),
            ),
            { signal: controller.signal },
        ).then(
            (value) => {
                if (!controller.signal.aborted)
                    setConfiguration({ loaded: true, value });
            },
            (error: unknown) => {
                if (!controller.signal.aborted)
                    setConfiguration((previous) => ({
                        ...previous,
                        loaded: true,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    }));
            },
        );
        return () => controller.abort();
    }, [connection, ready]);
    return (
        <ConfigContext value={configuration}>
            {configuration.error && (
                <div role="alert" className="p-3 text-destructive">
                    Could not load configuration: {configuration.error}
                </div>
            )}
            {children}
        </ConfigContext>
    );
}

export function useApplicationConfig() {
    return useContext(ConfigContext);
}
