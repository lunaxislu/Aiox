import { useState } from "react";

import type { ApplicationStore } from "@/shared/api/application-store";
import { Button } from "@/shared/ui/button";
export function useCommandFeedback() {
    const [message, setMessage] = useState<string | null>(null);
    function reportOutcome(
        command: ReturnType<ApplicationStore["panelCommand"]>,
    ) {
        setMessage(null);
        void command.result.then((outcome) => {
            if (
                outcome.status === "rejected" ||
                outcome.status === "unexecuted"
            ) {
                const issue =
                    outcome.issue instanceof Error
                        ? outcome.issue.message
                        : JSON.stringify(outcome.issue);
                setMessage(
                    `${outcome.status === "unexecuted" ? "Command not executed" : "Command rejected"}: ${issue}`,
                );
            }
        });
    }
    return { message, reportOutcome, clear: () => setMessage(null) };
}
export function CommandFeedback({
    feedback,
}: {
    feedback: ReturnType<typeof useCommandFeedback>;
}) {
    return feedback.message ? (
        <div
            role="alert"
            className="flex items-center gap-2 p-3 text-destructive"
        >
            {feedback.message}
            <Button variant="ghost" size="sm" onClick={feedback.clear}>
                Dismiss
            </Button>
        </div>
    ) : null;
}
