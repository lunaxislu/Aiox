import type { IncomingMessage, ServerResponse } from "node:http";

import { NodeHttpServerRequest } from "@effect/platform-node";
import { Effect } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

/** Web Request/Response boundary shared by CLI HTTP and the MCP SDK. Routing is Effect HTTP. */
export class HttpContext {
    readonly headers: Headers = new Headers();
    readonly values = new Map<string, unknown>();
    res: Response = new Response(null);
    readonly req;
    #params: Readonly<Record<string, string | undefined>>;
    constructor(
        raw: Request,
        params: Readonly<Record<string, string | undefined>>,
        readonly env: { incoming: IncomingMessage; outgoing: ServerResponse },
    ) {
        this.#params = params;
        const url = new URL(raw.url);
        this.req = {
            raw,
            url: raw.url,
            path: url.pathname,
            method: raw.method,
            param: (key: string) => this.#params[key] ?? "",
            query: (key: string) => url.searchParams.get(key) ?? undefined,
            header: (key: string) => raw.headers.get(key) ?? undefined,
        };
    }
    setParams(params: Readonly<Record<string, string | undefined>>) {
        this.#params = params;
    }
    set(key: string, value: unknown) {
        this.values.set(key, value);
    }
    get(key: string) {
        return this.values.get(key);
    }
    header(key: string, value: string) {
        this.headers.set(key, value);
    }
    body(
        body: ConstructorParameters<typeof Response>[0],
        status = 200,
        headers?: NonNullable<
            ConstructorParameters<typeof Response>[1]
        >["headers"],
    ): Response {
        const merged = new Headers(this.headers);
        new Headers(headers).forEach((value, key) => merged.set(key, value));
        return (this.res = new Response(body, { status, headers: merged }));
    }
    json(value: unknown, status = 200): Response {
        return this.body(JSON.stringify(value), status, {
            "content-type": "application/json; charset=utf-8",
        });
    }
    text(value: string, status = 200): Response {
        return this.body(value, status, {
            "content-type": "text/plain; charset=utf-8",
        });
    }
}
export type Context<_Env = unknown> = HttpContext;
export type Handler = (context: HttpContext) => Response | Promise<Response>;
const contexts = new WeakMap<IncomingMessage, HttpContext>();
export const contextFromRequest = (
    request: HttpServerRequest.HttpServerRequest,
    params?: Readonly<Record<string, string | undefined>>,
) =>
    Effect.suspend(() => {
        const incoming = NodeHttpServerRequest.toIncomingMessage(request);
        const existing = contexts.get(incoming);
        if (existing) {
            if (params) existing.setParams(params);
            return Effect.succeed(existing);
        }
        return Effect.map(HttpServerRequest.toWeb(request), (raw) => {
            const context = new HttpContext(raw, params ?? {}, {
                incoming,
                outgoing: NodeHttpServerRequest.toServerResponse(request),
            });
            contexts.set(incoming, context);
            return context;
        });
    });

export function addEndpoint(
    router: HttpRouter.HttpRouter,
    method: Parameters<HttpRouter.HttpRouter["add"]>[0],
    paths: string | readonly string[],
    handler: Handler,
) {
    for (const path of typeof paths === "string" ? [paths] : paths)
        Effect.runSync(
            router.add(
                method,
                path as HttpRouter.PathInput,
                Effect.gen(function* () {
                    const request = yield* HttpServerRequest.HttpServerRequest;
                    const params = yield* HttpRouter.params;
                    const context = yield* contextFromRequest(request, params);
                    const response = yield* Effect.tryPromise({
                        try: () => Promise.resolve(handler(context)),
                        catch: (error) => error,
                    });
                    return HttpServerResponse.fromWeb(response);
                }).pipe(Effect.orDie),
            ),
        );
}
