import {
  createGatewayClient,
  endpointDiscoverySchema,
  gatewaySnapshotSchema,
  gatewaySubscribeMethod,
  serverStopMethod,
  serverStopResultSchema,
  sessionCredentialSchema,
  type EndpointDiscovery,
  type GatewayClient,
  type GatewaySnapshot,
  type ReconnectGatewayTransport,
  type ServerStopResult,
} from "@aiox/protocol";

export interface CliPlatform {
  readEndpoint(): Promise<EndpointDiscovery>;
  readCredential(): Promise<string>;
  connect(endpoint: EndpointDiscovery): Promise<ReconnectGatewayTransport>;
  spawnServer(port?: number): Promise<void>;
  openBrowser(url: string): Promise<void>;
  fetchStatic(origin: string): Promise<{
    status: number;
    contentType: string | null;
  }>;
  wait(milliseconds: number): Promise<void>;
}

export interface CliOperationsOptions {
  readinessAttempts?: number;
  readinessDelayMs?: number;
}

export interface DoctorCheck {
  component: "endpoint" | "session-credential" | "gateway" | "static";
  status: "ok" | "error";
  message?: string;
}

interface ConnectedSession {
  endpoint: EndpointDiscovery;
  credential: string;
  snapshot: GatewaySnapshot;
  gateway: GatewayClient;
  close(): void;
}

export function createCliOperations(
  platform: CliPlatform,
  options: CliOperationsOptions = {},
) {
  const readinessAttempts = options.readinessAttempts ?? 50;
  const readinessDelayMs = options.readinessDelayMs ?? 100;
  let requestSequence = 0;

  async function connectSession(): Promise<ConnectedSession> {
    const endpoint = endpointDiscoverySchema.parse(await platform.readEndpoint());
    const parsedCredential = sessionCredentialSchema.safeParse(
      await platform.readCredential(),
    );
    if (!parsedCredential.success) {
      throw new Error("Session credential is invalid");
    }
    const credential = parsedCredential.data;
    const transport = await platform.connect(endpoint);
    const gateway = createGatewayClient({
      transport,
      createRequestId: () => `cli-${requestSequence++}`,
    });
    try {
      const snapshot = await gateway.request(
        gatewaySubscribeMethod,
        { credential },
        gatewaySnapshotSchema,
      );
      return {
        endpoint,
        credential,
        snapshot,
        gateway,
        close() {
          gateway.dispose("cli-operation-complete");
          transport.close();
        },
      };
    } catch (error) {
      gateway.dispose(error);
      transport.close();
      throw error;
    }
  }

  async function readySession(): Promise<ConnectedSession> {
    const session = await connectSession();
    if (session.snapshot.server.lifecycle !== "running") {
      session.close();
      throw new Error(
        `Local Server is ${session.snapshot.server.lifecycle}, not running`,
      );
    }
    return session;
  }

  async function openSessionInBrowser(session: ConnectedSession): Promise<void> {
    const url = new URL("/", session.endpoint.origin);
    url.hash = `session=${encodeURIComponent(session.credential)}`;
    await platform.openBrowser(url.toString());
  }

  async function probeReady(): Promise<ConnectedSession | undefined> {
    try {
      return await readySession();
    } catch {
      return undefined;
    }
  }

  return {
    async start({
      noOpen,
      port,
    }: {
      noOpen: boolean;
      port?: number;
    }): Promise<{
      started: boolean;
      endpoint: EndpointDiscovery;
      snapshot: GatewaySnapshot;
    }> {
      let session = await probeReady();
      const started = !session;
      if (!session) {
        await platform.spawnServer(port);
        for (let attempt = 0; attempt < readinessAttempts; attempt += 1) {
          session = await probeReady();
          if (session) break;
          if (attempt + 1 < readinessAttempts) {
            await platform.wait(readinessDelayMs);
          }
        }
      }
      if (!session) {
        throw new Error("Local Server did not become ready before the timeout");
      }
      try {
        if (!noOpen) await openSessionInBrowser(session);
        return {
          started,
          endpoint: session.endpoint,
          snapshot: session.snapshot,
        };
      } finally {
        session.close();
      }
    },

    async open(): Promise<{ endpoint: EndpointDiscovery }> {
      const session = await readySession();
      try {
        await openSessionInBrowser(session);
        return { endpoint: session.endpoint };
      } finally {
        session.close();
      }
    },

    async status(): Promise<
      | {
          running: true;
          endpoint: EndpointDiscovery;
          snapshot: GatewaySnapshot;
        }
      | { running: false }
    > {
      try {
        const session = await connectSession();
        try {
          return {
            running: true,
            endpoint: session.endpoint,
            snapshot: session.snapshot,
          };
        } finally {
          session.close();
        }
      } catch {
        return { running: false };
      }
    },

    async stop({ force }: { force: boolean }): Promise<ServerStopResult> {
      const session = await connectSession();
      try {
        return await session.gateway.request(
          serverStopMethod,
          { force },
          serverStopResultSchema,
        );
      } finally {
        session.close();
      }
    },

    async doctor(): Promise<{ ok: boolean; checks: DoctorCheck[] }> {
      const checks: DoctorCheck[] = [];
      let endpoint: EndpointDiscovery | undefined;
      let credential: string | undefined;

      try {
        endpoint = endpointDiscoverySchema.parse(await platform.readEndpoint());
        checks.push({ component: "endpoint", status: "ok" });
      } catch (error) {
        checks.push({
          component: "endpoint",
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      try {
        credential = sessionCredentialSchema.parse(
          await platform.readCredential(),
        );
        checks.push({ component: "session-credential", status: "ok" });
      } catch (error) {
        checks.push({
          component: "session-credential",
          status: "error",
          message:
            error instanceof Error && error.name !== "ZodError"
              ? error.message
              : "Session credential is unavailable or invalid",
        });
      }

      if (endpoint && credential) {
        try {
          const session = await connectSession();
          session.close();
          checks.push({ component: "gateway", status: "ok" });
        } catch (error) {
          checks.push({
            component: "gateway",
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        checks.push({
          component: "gateway",
          status: "error",
          message: "Endpoint and session credential are required",
        });
      }

      if (endpoint) {
        try {
          const response = await platform.fetchStatic(endpoint.origin);
          if (
            response.status !== 200 ||
            !response.contentType?.startsWith("text/html")
          ) {
            throw new Error(
              `Static readiness returned ${response.status} ${response.contentType ?? "without content type"}`,
            );
          }
          checks.push({ component: "static", status: "ok" });
        } catch (error) {
          checks.push({
            component: "static",
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        checks.push({
          component: "static",
          status: "error",
          message: "Endpoint is required",
        });
      }

      return {
        ok: checks.every((check) => check.status === "ok"),
        checks,
      };
    },
  };
}

export type CliOperations = ReturnType<typeof createCliOperations>;
