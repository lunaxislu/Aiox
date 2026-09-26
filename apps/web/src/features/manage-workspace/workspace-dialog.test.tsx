import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { previewPanels as panels } from "@/entities/panel/fixtures";

import { WorkspaceDialog } from "./workspace-dialog";
afterEach(cleanup);
it.each(["create", "rename"] as const)(
    "rejects blank %s names and allows correction",
    (type) => {
        const submit = vi.fn();
        render(
            <WorkspaceDialog
                action={
                    type === "create"
                        ? { type, section: "workspaces" }
                        : { type, panel: panels[0]! }
                }
                onSubmit={submit}
                onClose={() => {}}
            />,
        );
        const input = screen.getByRole("textbox", { name: "Name" });
        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.submit(input.closest("form")!);
        expect(submit).not.toHaveBeenCalled();
        expect(screen.getByRole("alert").textContent).toMatch(/name/i);
        fireEvent.change(input, { target: { value: "  Valid  " } });
        fireEvent.submit(input.closest("form")!);
        expect(submit).toHaveBeenCalledWith("Valid");
    },
);

it("lists every terminal state and offers cancel or explicit stop and delete", () => {
    const submit = vi.fn();
    render(
        <WorkspaceDialog
            action={{
                type: "delete",
                panel: panels[0]!,
                terminals: [
                    { tabId: "shell", label: "Shell", status: "idle" },
                    { tabId: "agent", label: "Reviewer", status: "running" },
                    { tabId: "unknown", label: "Build", status: "unknown" },
                ],
            }}
            onSubmit={submit}
            onClose={() => {}}
        />,
    );
    expect(
        screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Shellidle", "Reviewerrunning", "Buildstatus unknown"]);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stop and delete" }));
    expect(submit).toHaveBeenCalledWith("");
});
