import {
  createServer,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";

import {
  serverStopMethod,
  serverStopParamsSchema,
  type EndpointDiscovery,
} from "@aiox/protocol";
import {
  createAuthenticatedControlSession,
  GatewayMethodError,
} from "../gateway/control/authenticated-session.js";
import {
  createControlWebSocketServer,
  type ControlWebSocketServer,
} from "../gateway/control/websocket-server.js";
import {
  assertStaticDirectoryReady,
  serveStaticFile,
} from "../http/static-files.js";
import {
  publishEndpointDiscovery,
  removeOwnedEndpoint,
} from "../runtime-files/endpoint-discovery.js";
import {
  createSessionCredential,
  publishSessionCredential,
  removeOwnedSessionCredential,
} from "../runtime-files/session-credential.js";
import {
  createGatewayState,
  type GatewayState,
} from "../gateway/state/gateway-state.js";
import {
  createShutdownCoordinator,
  type ShutdownCoordinator,
} from "../gateway/state/shutdown-coordinator.js";

export interface LocalServerOptions {
  staticDirectory: string;
  endpointFile: string;
  sessionTokenFile: string;
  serverEpoch: string;
  port?: number;
  pid?: number;
  authenticationTimeoutMs?: number;
  onCleanupError?: (error: unknown) => void;
  onStopped?: () => void | Promise<void>;
}

export interface LocalServer {
  start(): Promise<EndpointDiscovery>;
  stop(): Promise<void>;
  readonly gatewayState: GatewayState;
  readonly shutdown: ShutdownCoordinator;
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen({ host: "127.0.0.1", port });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export function createLocalServer(options: LocalServerOptions): LocalServer {
  let httpServer: Server | undefined;
  let controlServer: ControlWebSocketServer | undefined;
  let endpoint: EndpointDiscovery | undefined;
  let sessionCredential: string | undefined;
  const gatewayState = createGatewayState({ serverEpoch: options.serverEpoch });
  const shutdown = createShutdownCoordinator({ gatewayState });
  let startPromise: Promise<EndpointDiscovery> | undefined;
  let stopPromise: Promise<void> | undefined;

  function start(): Promise<EndpointDiscovery> {
    if (endpoint) return Promise.resolve(endpoint);
    if (stopPromise) {
      return Promise.reject(new Error("A stopped Local Server cannot restart"));
    }
    if (startPromise) return startPromise;

    startPromise = (async () => {
      await assertStaticDirectoryReady(options.staticDirectory);
      const credential = createSessionCredential();
      const webSockets = createControlWebSocketServer({
        onConnection: createAuthenticatedControlSession({
          credential,
          gatewayState,
          authenticationTimeoutMs: options.authenticationTimeoutMs ?? 5_000,
          methods: {
            [serverStopMethod]: async (paramsInput) => {
              const params = serverStopParamsSchema.safeParse(paramsInput);
              if (!params.success) {
                throw new GatewayMethodError({
                  code: "INVALID_PARAMS",
                  message: "Server stop parameters are invalid",
                  retryable: false,
                });
              }
              const result = await shutdown.prepareStop(params.data.force);
              return {
                payload: result,
                afterResponse: result.accepted
                  ? () => {
                      void stop().catch((error: unknown) =>
                        options.onCleanupError?.(error),
                      );
                    }
                  : undefined,
              };
            },
          },
        }),
      });
      const server = createServer((request, response) => {
        void serveStaticFile(options.staticDirectory, request, response);
      });
      webSockets.attach(server);

      try {
        await listen(server, options.port ?? 0);
        const address = server.address() as AddressInfo;
        await publishSessionCredential(options.sessionTokenFile, credential);
        sessionCredential = credential;
        gatewayState.setServerLifecycle("running");
        const discovered = await publishEndpointDiscovery(options.endpointFile, {
          origin: `http://127.0.0.1:${address.port}`,
          pid: options.pid ?? process.pid,
          serverEpoch: options.serverEpoch,
        });
        httpServer = server;
        controlServer = webSockets;
        endpoint = discovered;
        return discovered;
      } catch (error) {
        if (server.listening) await close(server);
        await webSockets.close();
        if (sessionCredential === credential) {
          await removeOwnedSessionCredential(
            options.sessionTokenFile,
            credential,
          );
          sessionCredential = undefined;
        }
        throw error;
      }
    })();
    void startPromise.catch(() => {
      startPromise = undefined;
    });
    return startPromise;
  }

  function stop(): Promise<void> {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      try {
        await startPromise;
      } catch {
        // Startup already performed its own partial-resource cleanup.
      }
      const server = httpServer;
      const webSockets = controlServer;
      const ownedEndpoint = endpoint;
      const ownedCredential = sessionCredential;
      httpServer = undefined;
      controlServer = undefined;
      endpoint = undefined;
      sessionCredential = undefined;

      if (gatewayState.snapshot().server.lifecycle !== "stopping") {
        gatewayState.setServerLifecycle("stopping");
      }
      const cleanupErrors: unknown[] = [];
      const cleanup = async (operation: () => Promise<void>): Promise<void> => {
        try {
          await operation();
        } catch (error) {
          cleanupErrors.push(error);
        }
      };
      const httpClose = server?.listening
        ? close(server).catch((error: unknown) => {
            cleanupErrors.push(error);
          })
        : Promise.resolve();
      if (ownedEndpoint) {
        await cleanup(() =>
          removeOwnedEndpoint(
            options.endpointFile,
            ownedEndpoint.serverEpoch,
          ),
        );
      }
      if (ownedCredential) {
        await cleanup(() =>
          removeOwnedSessionCredential(
            options.sessionTokenFile,
            ownedCredential,
          ),
        );
      }

      if (cleanupErrors.length === 0) shutdown.completeStop();
      else shutdown.failStop();
      if (webSockets) await cleanup(() => webSockets.close());
      await httpClose;
      if (
        cleanupErrors.length > 0 &&
        gatewayState.snapshot().server.lifecycle === "stopped"
      ) {
        shutdown.failStop();
      }
      try {
        await options.onStopped?.();
      } catch (error) {
        cleanupErrors.push(error);
        shutdown.failStop();
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, "Local Server cleanup failed");
      }
    })();
    return stopPromise;
  }

  return {
    gatewayState,
    shutdown,
    start,
    stop,
  };
}
