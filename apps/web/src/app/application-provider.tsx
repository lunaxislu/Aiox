import type { ApplicationEvent } from "@aiox/protocol";
import {
    createContext,
    useContext,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";

import {
    ApplicationConnection,
    applicationRpcUrl,
} from "@/shared/api/application-connection";
import { ApplicationStore } from "@/shared/api/application-store";

import { ApplicationConfigProvider } from "./application-config";
import { ApplicationStateProvider } from "./application-state";

const ApplicationContext = createContext<ApplicationConnection | null>(null);

export function ApplicationProvider({
    children,
    onEvent,
    connection: supplied,
}: {
    children: ReactNode;
    onEvent?: (event: ApplicationEvent) => void;
    connection?: ApplicationConnection;
}) {
    const [connection] = useState(
        () =>
            supplied ??
            new ApplicationConnection(applicationRpcUrl(window.location.href)),
    );
    const [store] = useState(() => new ApplicationStore());
    const generation = useRef(0);
    const receive = useEffectEvent((event: ApplicationEvent) => {
        store.onEvent(event);
        onEvent?.(event);
    });
    useEffect(() => {
        const mounted = ++generation.current;
        const stop = connection.start(receive);
        return () => {
            void stop().then(() => {
                // StrictMode's immediate remount keeps the same app-owned store alive.
                if (generation.current === mounted) void store.dispose();
            });
        };
    }, [connection, store]);
    return (
        <ApplicationContext value={connection}>
            <ApplicationStateProvider store={store} connection={connection}>
                <ApplicationConfigProvider connection={connection}>
                    {children}
                </ApplicationConfigProvider>
            </ApplicationStateProvider>
        </ApplicationContext>
    );
}

export function useApplicationConnection() {
    return useContext(ApplicationContext);
}
const emptySubscribe = () => () => {};
const noConnection = () => undefined;
export function useApplicationConnectionState() {
    const connection = useApplicationConnection();
    return useSyncExternalStore(
        connection?.subscribe ?? emptySubscribe,
        connection?.getSnapshot ?? noConnection,
    );
}
