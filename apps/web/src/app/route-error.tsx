import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
} from "@/shared/ui/empty";

export function RouteError() {
    return (
        <main className="flex min-h-dvh items-center justify-center p-6">
            <Empty role="alert">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <TriangleAlertIcon />
                    </EmptyMedia>
                    <h1 className="text-lg font-semibold">
                        Something went wrong
                    </h1>
                    <EmptyDescription>
                        This page could not be displayed. Reload it or return to
                        the overview.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button onClick={() => window.location.reload()}>
                        Reload page
                    </Button>
                    <Button
                        variant="outline"
                        render={<a href="/" aria-label="Back to overview" />}
                    >
                        Back to overview
                    </Button>
                </EmptyContent>
            </Empty>
        </main>
    );
}
