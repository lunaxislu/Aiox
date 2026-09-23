import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/shared/ui/button";

import { cn } from "../lib/utils";
interface Props {
    command: string;
    className?: string;
}
export function CopyCommand({ command, className }: Props) {
    const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
    const copied = state === "copied";

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setState("idle"), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(command);
            setState("copied");
        } catch {
            setState("failed");
        }
    }

    return (
        <div className={cn("w-full min-w-0", className)}>
            <div
                className={cn(
                    "flex items-start gap-2 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5",
                    state === "failed" && "border-destructive",
                )}
            >
                {/* 2. bash 프롬프트 심볼 추가 (선택 제외 및 스크린리더 숨김) */}
                <code className="min-w-0 flex-1 py-1.5 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-anywhere select-all">
                    <span
                        className="font-mono text-xs text-muted-foreground select-none ml-0.5 mr-1"
                        aria-hidden="true"
                    >
                        $
                    </span>
                    {command}
                </code>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={copied ? "Copied" : `Copy ${command}`}
                    onClick={copy}
                >
                    {copied ? (
                        <CheckIcon className="text-emerald-500" />
                    ) : (
                        <CopyIcon />
                    )}
                </Button>
            </div>

            <p role="alert" className="mt-1.5 h-4 text-xs text-destructive">
                {state === "failed" && "Copy failed. Select the text manually."}
            </p>
        </div>
    );
}
