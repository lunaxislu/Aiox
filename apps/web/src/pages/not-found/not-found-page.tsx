import { Unplug } from "lucide-react";
import { Link } from "react-router";

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty";

export function NotFoundPage() {
    return (
        <section className="flex h-full flex-col items-center justify-center gap-4">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Unplug />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg md:text-2xl">
                        Page not found
                    </EmptyTitle>
                    <EmptyDescription>
                        <Link to="/">Back to main</Link>
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <p className="text-sm text-muted-foreground">
                        The page you are looking for does not exist.
                    </p>
                </EmptyContent>
            </Empty>
        </section>
    );
}
