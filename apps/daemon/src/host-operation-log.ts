import { logger } from "@aiox/diagnostics";
import type { Operation } from "@aiox/protocol";

export function logHostOperationAccepted(
    operation: Operation,
    requestId: string,
) {
    logger.info(
        {
            operationId: operation.id,
            operationRequestId: operation.requestId,
            requestId,
            hostId: operation.hostId,
        },
        "Host operation accepted",
    );
}
