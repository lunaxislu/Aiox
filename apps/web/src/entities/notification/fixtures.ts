import type { WebNotificationView } from "@aiox/protocol";

const minutesAgo = (value: number) => Date.now() - value * 60_000;

/** 서버와 같은 `createdAt` 오름차순이다. 최신순 정렬은 화면이 한다. */
export const previewNotifications: WebNotificationView[] = [
    {
        id: "notification-stopped",
        // 탭은 stopped로 남았지만 실행이 사라져 이름도 이동 대상도 없다.
        originRuntimeId: "runtime-crashed",
        terminalId: "terminal-crashed",
        body: "builder stopped before answering your request.",
        createdAt: minutesAgo(180),
        readAt: null,
    },
    {
        id: "notification-approval",
        originRuntimeId: "runtime-preparing-shell",
        terminalId: "terminal-preparing-shell",
        body: "claude is waiting for your approval to edit aiox.yaml.claude is waiting for your approval to edit aiox.yaml.claude is waiting for your approval to edit aiox.yaml.",
        createdAt: minutesAgo(25),
        readAt: null,
    },
    {
        id: "notification-review",
        originRuntimeId: "runtime-reviewer",
        terminalId: "terminal-reviewer",
        body: "reviewer finished the review request.",
        createdAt: minutesAgo(2),
        readAt: null,
    },
    {
        id: "notification-review-2",
        originRuntimeId: "runtime-reviewer",
        terminalId: "terminal-reviewer",
        body: "reviewer finished the review request.",
        createdAt: minutesAgo(2),
        readAt: null,
    },
    {
        id: "notification-review-3",
        originRuntimeId: "runtime-reviewer",
        terminalId: "terminal-reviewer",
        body: "reviewer finished the review request.",
        createdAt: minutesAgo(2),
        readAt: null,
    },
    {
        id: "notification-review-4",
        originRuntimeId: "runtime-reviewer",
        terminalId: "terminal-reviewer",
        body: "reviewer finished the review request.",
        createdAt: minutesAgo(2),
        readAt: null,
    },
];
