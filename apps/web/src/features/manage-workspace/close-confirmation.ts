export type CloseTerminal = {
    tabId: string;
    label: string;
    status: "idle" | "running" | "unknown";
};

export function confirmationTerminals(issue: unknown): CloseTerminal[] | null {
    if (
        typeof issue !== "object" ||
        issue === null ||
        !("code" in issue) ||
        issue.code !== "confirmation_required" ||
        !("details" in issue)
    )
        return null;
    const details = issue.details;
    if (
        typeof details !== "object" ||
        details === null ||
        !("terminals" in details) ||
        !Array.isArray(details.terminals)
    )
        return null;
    return details.terminals.every(
        (row): row is CloseTerminal =>
            typeof row === "object" &&
            row !== null &&
            typeof row.tabId === "string" &&
            typeof row.label === "string" &&
            ["idle", "running", "unknown"].includes(row.status),
    )
        ? details.terminals
        : null;
}
