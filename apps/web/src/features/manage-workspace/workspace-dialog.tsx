import { Dialog } from "@base-ui/react/dialog";
import { useRef } from "react";

import type { PanelPreview, Section } from "@/entities/panel/model";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export type WorkspaceAction =
    | { type: "create"; section: Section }
    | { type: "rename" | "delete"; panel: PanelPreview };

export function WorkspaceDialog({
    action,
    onSubmit,
    onClose,
}: {
    action: WorkspaceAction;
    onSubmit: (name: string) => void;
    onClose: () => void;
}) {
    const cancel = useRef<HTMLButtonElement>(null);
    const deleting = action.type === "delete";
    const title =
        action.type === "create"
            ? "New workspace"
            : action.type === "rename"
              ? "Rename workspace"
              : "Delete workspace?";
    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Popup
                    initialFocus={deleting ? cancel : true}
                    className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover p-5 shadow-xl"
                >
                    <Dialog.Title className="text-base font-semibold">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                        {deleting
                            ? `Delete “${action.panel.name}” and its terminals?`
                            : "Choose a name for this workspace."}
                    </Dialog.Description>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            onSubmit(
                                deleting
                                    ? ""
                                    : String(
                                          new FormData(event.currentTarget).get(
                                              "name",
                                          ),
                                      ),
                            );
                        }}
                    >
                        {!deleting && (
                            <div className="mt-4 space-y-1.5">
                                <label
                                    htmlFor="workspace-name"
                                    className="text-sm"
                                >
                                    Name
                                </label>
                                <Input
                                    id="workspace-name"
                                    name="name"
                                    defaultValue={
                                        action.type === "rename"
                                            ? action.panel.name
                                            : ""
                                    }
                                    required
                                    maxLength={128}
                                    pattern="[^\u0000-\u001f\u007f]+"
                                />
                            </div>
                        )}
                        <div className="mt-5 flex justify-end gap-2">
                            <Dialog.Close
                                render={
                                    <Button ref={cancel} variant="outline" />
                                }
                            >
                                Cancel
                            </Dialog.Close>
                            <Button
                                type="submit"
                                variant={deleting ? "destructive" : "default"}
                            >
                                {action.type === "create"
                                    ? "Create"
                                    : action.type === "rename"
                                      ? "Rename"
                                      : "Delete"}
                            </Button>
                        </div>
                    </form>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
