import pino from "pino";

// Diagnostic fields are an allowlist: request bodies, credentials, environment,
// vendor content and arbitrary error properties must never enter daemon.log.
const fields = new Set([
    "component",
    "requestId",
    "operationRequestId",
    "stage",
    "field",
    "failureCode",
    "exitCode",
    "signal",
    "operationId",
    "hostId",
    "runtimeId",
    "terminalId",
    "deliveryId",
    "networkId",
    "statusCode",
    "method",
    "daemonPort",
    "webPort",
    "warningCount",
    "blockingCount",
    "state",
]);

export const logger = pino(
    {
        name: "aiox",
        formatters: {
            log(object) {
                return Object.fromEntries(
                    Object.entries(object).filter(
                        ([key, value]) =>
                            key === "err" ||
                            (fields.has(key) &&
                                (typeof value === "string" ||
                                    typeof value === "number" ||
                                    value === null)),
                    ),
                );
            },
        },
        serializers: {
            err(error: unknown) {
                // Error.message/stack/cause can contain tokens, SQL, paths or vendor
                // text. Keep the fixed call-site message and safe error classification.
                const type =
                    error instanceof TypeError
                        ? "TypeError"
                        : error instanceof SyntaxError
                          ? "SyntaxError"
                          : error instanceof RangeError
                            ? "RangeError"
                            : error instanceof AggregateError
                              ? "AggregateError"
                              : error instanceof Error
                                ? "Error"
                                : "UnknownError";
                const code =
                    error !== null &&
                    typeof error === "object" &&
                    "code" in error &&
                    typeof error.code === "string" &&
                    /^(?:E[A-Z0-9_]{1,39}|SQLITE_[A-Z0-9_]{1,32})$/.test(
                        error.code,
                    )
                        ? error.code
                        : undefined;
                return { type, ...(code === undefined ? {} : { code }) };
            },
        },
    },
    pino.destination({ dest: 2, sync: true }),
);
